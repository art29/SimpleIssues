import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Organization from 'App/Models/Organization'
import OrganizationUser from 'App/Models/OrganizationUser'
import User from 'App/Models/User'
import Database from '@ioc:Adonis/Lucid/Database'
import OrganizationInvite from 'App/Models/OrganizationInvite'
import { githubLogin, githubWrapper } from 'App/Services/GithubService'

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

    response.ok({ users: users, organization: org, labels: labels })
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
    response.abortUnless(
      await User.findByOrFail('email', request.body().email),
      'User not found.',
      422
    )

    const newUser: OrganizationUser = await OrganizationUser.create({
      organization_id: auth.user?.organizationId,
      user_id: request.body().user_id,
      role: 'regular',
    })

    if (newUser.$isPersisted) {
      response.ok(newUser)
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
    response.abortUnless(
      await User.findByOrFail('email', request.body().email),
      'User not found.',
      422
    )

    Organization.query()
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
    response.abortUnless(
      await User.findByOrFail('email', request.body().email),
      'User not found.',
      422
    )

    Organization.query()
      .where('id', auth.user!.organizationId)
      .update('mandatory_labels', request.body().added_labels)

    response.ok({ success: true })
  }

  public async invite_user({ auth, request, response }: HttpContextContract) {
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

    const invitedUser = await OrganizationInvite.create({
      organizationId: auth.user?.organizationId,
      email: request.body().email,
    })

    if (invitedUser.$isPersisted) {
      response.ok(invitedUser)
    } else {
      response.internalServerError('An error occurred while adding the new user...')
    }
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
