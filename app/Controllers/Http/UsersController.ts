// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import OrganizationUser from 'App/Models/OrganizationUser'
import Organization from 'App/Models/Organization'
import { githubWrapper } from 'App/Services/GithubService'
import User from 'App/Models/User'

export default class UsersController {
  public static async getRepos(organizationId: number) {
    const organization: Organization | null = await Organization.find(organizationId)

    return organization?.installation_id
      ? await githubWrapper(organization.installation_id, 'GET /installation/repositories', {})
      : null
  }

  public async organizations({ auth, response }: HttpContextContract) {
    response.abortIf(!auth.user, 'Missing User Id', 500)
    const organizationUsers: number[] = (
      await OrganizationUser.query().where('user_id', auth.user!.id).select('organization_id')
    ).map((orgUser) => orgUser.organization_id)
    const organizations: Organization[] = (
      await Organization.query().whereIn('id', organizationUsers).select('id', 'name')
    ).filter((org) => org.name)

    response.ok({ organizations: organizations })
  }

  public async set_organization({ auth, request, response }: HttpContextContract) {
    response.abortUnless(auth.user, 'Missing User Id', 500)
    response.abortUnless(request.body().organization_id, 'Missing Organization Id', 422)

    const repoOrg = await UsersController.getRepos(request.body().organization_id)

    if (repoOrg && repoOrg.data?.repositories[0]) {
      await User.query().where('id', auth.user!.id).update({
        organization_id: request.body().organization_id,
        default_organization: repoOrg.data.repositories[0].owner.login,
        default_repo: repoOrg.data.repositories[0].name,
      })
      response.ok({ user: await User.find(auth.user!.id) })
    } else {
      response.internalServerError('An error occurred while getting Github data...')
    }
  }

  public async repos({ auth, request, response }: HttpContextContract) {
    response.abortUnless(auth.user, 'Missing User Id', 500)

    const repoOrg = await UsersController.getRepos(auth.user!.organizationId)

    if (repoOrg) {
      response.ok({
        repos:
          request.param('full') === true
            ? repoOrg.data.repositories
            : repoOrg.data.repositories.map((r) => {
                return { full_name: r.full_name, name: r.name }
              }),
      })
    } else {
      response.internalServerError('An error occurred while getting Github data...')
    }
  }

  public async set_repo({ auth, request, response }: HttpContextContract) {
    response.abortUnless(auth.user, 'Missing User Id', 500)
    response.abortUnless(request.body().repo, 'Missing Repo Name', 422)

    const repoOrg = await UsersController.getRepos(auth.user!.organizationId)

    if (repoOrg) {
      if (repoOrg.data?.repositories.filter((r) => r.name === request.body().repo).length) {
        await User.query().where('id', auth.user!.id).update({
          default_repo: request.body().repo,
        })
        response.ok({ user: await User.find(auth.user!.id) })
      } else {
        response.internalServerError('The repo you are trying to select does not exist...')
      }
    } else {
      response.internalServerError('An error occurred while getting Github data...')
    }
  }

  public async user_info({ auth, response }: HttpContextContract) {
    const orgUser = await OrganizationUser.query()
      .where('user_id', auth.user!.id)
      .andWhere('organization_id', auth.user!.organizationId)
      .first()

    response.ok({
      organization_admin: orgUser?.role === 'admin',
    })
  }
}
