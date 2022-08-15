import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Organization from 'App/Models/Organization'
import OrganizationUser from 'App/Models/OrganizationUser'
import User from 'App/Models/User'
import Database from '@ioc:Adonis/Lucid/Database'
import OrganizationInvite from 'App/Models/OrganizationInvite'
import { githubLogin, githubWrapper } from 'App/Services/GithubService'
import Mail from '@ioc:Adonis/Addons/Mail'
import Env from '@ioc:Adonis/Core/Env'

export default class OrganizationsController {
  public async activate({ auth, request, response }: HttpContextContract) {
    response.abortUnless(request.body().installation_id, 'Missing installation ID', 422)
    response.abortUnless(request.body().organization_name, 'Missing Organization Name', 422)

    const org: Organization = await Organization.firstOrCreate({
      installation_id: request.body().installation_id,
      name: request.body().organization_name,
    })

    if (org.id) {
      const orgUser: OrganizationUser = await OrganizationUser.firstOrCreate({
        organization_id: org.id,
        user_id: auth.user?.id,
        role: 'admin',
      })
      if (auth.user && !auth.user?.organizationId) {
        await User.query().where('id', auth.user.id).update('organization_id', org.id)
      }
      response.ok(orgUser)
    } else {
      response.internalServerError('An error occurred while creating the Organization.')
    }
  }

  public async index({ auth, response }: HttpContextContract) {
    response.abortIf(!auth.user?.organizationId, 'Missing Organization ID', 422)
    response.abortIf(
      !(await Organization.find(auth.user?.organizationId)),
      'Missing Valid Organization',
      422
    )
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organizationId)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )

    const users = await Database.query()
      .from('organization_users')
      .join('users', (query) => {
        query.on('users.id', '=', 'organization_users.user_id')
      })
      .where('organization_users.organization_id', auth.user!.organizationId)
      .select('organization_users.id', 'user_id', 'role', 'name', 'email')

    const org = await Organization.find(auth.user?.organizationId)

    const appOctokit = await githubLogin(org!.installation_id)
    const labels = await githubWrapper(
      undefined,
      'GET /repos/{owner}/{repo}/labels',
      {
        owner: auth.user?.defaultOrganization,
        repo: auth.user?.defaultRepo,
      },
      appOctokit
    )

    if (labels && org) {
      response.ok({
        users: users,
        organization: org,
        labels: labels.data.map((l) => l.name),
        mandatory_labels: org?.mandatory_labels ? org?.mandatory_labels.split(',') : [],
        added_labels: org?.added_labels ? org?.added_labels.split(',') : [],
      })
    } else {
      response.internalServerError({ error: 'Error occurred while getting labels' })
    }
  }

  public async add_user({ auth, request, response }: HttpContextContract) {
    response.abortIf(!request.body().email, 'Missing email', 422)
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organizationId)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )

    let newUser: OrganizationUser | OrganizationInvite
    const user = await User.findBy('email', request.body().email)
    if (user) {
      newUser = await OrganizationUser.firstOrCreate(
        { organization_id: auth.user?.organizationId, user_id: user.id },
        {
          organization_id: auth.user?.organizationId,
          user_id: request.body().id,
          role: 'regular',
        }
      )
    } else {
      newUser = await OrganizationInvite.firstOrCreate({
        organizationId: auth.user?.organizationId,
        email: request.body().email,
      })
    }

    if (newUser.$isPersisted) {
      if (user && newUser.$isLocal) {
        await Mail.send((msg) => {
          msg
            .from('simpleissues@afetiveau.com')
            .to(request.body().email)
            .subject('SimpleIssues | You have been added to an organization')
            .htmlView('emails/added_organization', {
              name: auth.user?.organization.name,
            })
        })
      } else if (!user && newUser.$isLocal) {
        await Mail.send(async (msg) => {
          msg
            .from('simpleissues@afetiveau.com')
            .to(request.body().email)
            .subject('SimpleIssues | You have been invited to an organization')
            .htmlView('emails/invite', {
              name: (await Organization.findOrFail(auth.user?.organizationId)).name,
              link: `${Env.get('FRONT_END_URL')}/signup`,
            })
        })
      }
      response.ok({ user: newUser, type: user ? 'added' : 'invited' })
    } else {
      response.internalServerError('An error occurred while adding the new user...')
    }
  }

  public async mandatory_labels({ auth, request, response }: HttpContextContract) {
    response.abortIf(!request.body().mandatory_labels, 'Missing mandatory labels', 422)
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organizationId)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )

    await Organization.query()
      .where('id', auth.user!.organizationId)
      .update('mandatory_labels', request.body().mandatory_labels)

    response.ok({ success: true })
  }

  public async added_labels({ auth, request, response }: HttpContextContract) {
    response.abortIf(!request.body().added_labels, 'Missing added labels', 422)
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organizationId)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )

    await Organization.query()
      .where('id', auth.user!.organizationId)
      .update('added_labels', request.body().added_labels)

    response.ok({ success: true })
  }

  public async remove_user({ auth, request, response }: HttpContextContract) {
    response.abortIf(!request.body().user_id, 'Missing user_id', 422)
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organizationId)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )
    response.abortUnless(
      await OrganizationUser.findByOrFail('user_id', request.body().user_id),
      'User not found.',
      422
    )

    const user = await OrganizationUser.query()
      .where('user_id', request.body().user_id)
      .andWhere('organization_id', auth.user?.organizationId!)
      .firstOrFail()

    await user.delete()

    response.ok({ success: true })
  }

  public async change_role({ auth, request, response }: HttpContextContract) {
    response.abortIf(!request.body().user_id, 'Missing user_id', 422)
    response.abortIf(
      !request.body().role && request.body().role !== 'admin' && request.body().role !== 'regular',
      'Missing role',
      422
    )
    response.abortUnless(
      !auth.user ||
        (
          await OrganizationUser.query()
            .where('user_id', auth.user.id)
            .andWhere('organization_id', auth.user.organizationId)
            .first()
        )?.role === 'admin',
      'You are not an admin for that Organization...',
      422
    )
    response.abortUnless(
      await OrganizationUser.findByOrFail('user_id', request.body().user_id),
      'User not found.',
      422
    )

    await OrganizationUser.query()
      .where('user_id', request.body().user_id)
      .andWhere('organization_id', auth.user?.organizationId!)
      .update({ role: request.body().role })

    response.ok({ success: true })
  }
}
