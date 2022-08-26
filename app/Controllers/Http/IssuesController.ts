import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { githubLogin, githubWrapper } from 'App/Services/GithubService'
import { schema } from '@ioc:Adonis/Core/Validator'
import { OctokitResponse } from '@octokit/types'
import OrganizationUser from 'App/Models/OrganizationUser'
import User from 'App/Models/User'
import UsersController from 'App/Controllers/Http/UsersController'
const parse = require('parse-link-header')

export default class IssuesController {
  private issueSchema = schema.create({
    title: schema.string(),
    body: schema.string.optional(),
    assignees: schema.array.optional().members(schema.string()),
    milestone: schema.number.optional(),
    labels: schema.array.optional().members(schema.string()),
  })

  public async index({ auth, request, response, bouncer }: HttpContextContract) {
    const organization = await auth.user?.related('organization').query().first()
    response.abortUnless(
      await OrganizationUser.query()
        .where('user_id', auth.user!.id)
        .andWhere('organization_id', auth.user!.organizationId)
        .first(),
      'You do not have the valid permissions to access this organization',
      403
    )
    await bouncer.authorize('githubRequest', organization?.installation_id)

    if (organization?.installation_id) {
      const appOctokit = await githubLogin(organization?.installation_id)

      if (!auth.user?.defaultOrganization && auth.user?.organizationId) {
        const repoOrg = await UsersController.getRepos(auth.user!.organizationId)

        if (repoOrg && repoOrg.data?.repositories[0]) {
          await User.query().where('id', auth.user!.id).update({
            default_organization: repoOrg.data.repositories[0].owner.login,
            default_repo: repoOrg.data.repositories[0].name,
          })
        }
      }

      const user: User = await User.findOrFail(auth.user?.id)

      const issues = await githubWrapper(
        organization?.installation_id,
        'GET /repos/{owner}/{repo}/issues',
        {
          owner: user.defaultOrganization,
          repo: user.defaultRepo,
          state: 'open',
          ...((request.qs().labels || organization.mandatory_labels) && {
            labels: [
              ...new Set([
                ...(request.qs().labels ?? []),
                ...(organization.mandatory_labels ? organization.mandatory_labels.split(',') : []),
              ]),
            ].join(','),
          }),
          per_page: 6,
          page: request.qs().page ?? 1,
        },
        appOctokit
      )

      const labels = await githubWrapper(
        organization?.installation_id,
        'GET /repos/{owner}/{repo}/labels',
        {
          owner: user.defaultOrganization,
          repo: user.defaultRepo,
        },
        appOctokit
      )

      if (issues && labels) {
        response.ok({
          issues: issues.data,
          max_page: parse(issues.headers.link)?.last?.page ?? request.qs().page ?? 1,
          labels: labels.data,
          organization: {
            id: user.organizationId,
            name: user.defaultOrganization,
          },
          repo: user.defaultRepo,
        })
      } else {
        response.internalServerError('An error occurred while getting Github data...')
      }
    } else {
      response.internalServerError(
        'An error occurred while getting the Github App Installation ID...'
      )
    }
  }

  public async store({ request, auth, response, bouncer }: HttpContextContract) {
    const organization = await auth.user?.related('organization').query().first()
    await bouncer.authorize('githubRequest', organization?.installation_id)

    const payload = await request.validate({ schema: this.issueSchema })

    const newIssue: boolean | OctokitResponse<any> = await githubWrapper(
      organization?.installation_id,
      'POST /repos/{owner}/{repo}/issues',
      {
        owner: auth.user?.defaultOrganization,
        repo: auth.user?.defaultRepo,
        title: payload.title,
        body: payload.body,
        ...(payload.assignees && { assignees: payload.assignees }),
        ...(payload.milestone && { milestone: payload.milestone }),
        ...(payload.labels
          ? {
              labels: [
                ...payload.labels,
                ...(organization!.added_labels ? organization!.added_labels.split(',') : []),
              ],
            }
          : { labels: organization!.added_labels ? organization!.added_labels.split(',') : [] }),
      }
    )

    if (newIssue && newIssue?.status === 201) {
      response.ok({
        issues: newIssue.data,
      })
    } else {
      response.internalServerError('An error occurred while creating the issue...')
    }
  }

  public async update({ request, response, auth, bouncer }: HttpContextContract) {
    const organization = await auth.user?.related('organization').query().first()
    await bouncer.authorize('githubRequest', organization?.installation_id)

    const payload = await request.validate({ schema: this.issueSchema })

    const updatedIssue: boolean | OctokitResponse<any> = await githubWrapper(
      organization!.installation_id,
      'PATCH /repos/{owner}/{repo}/issues/{issue_number}',
      {
        owner: auth.user?.defaultOrganization,
        repo: auth.user?.defaultRepo,
        issue_number: +request.param('id'),
        title: payload.title,
        body: payload.body,
        ...(payload.assignees && { assignees: payload.assignees }),
        ...(payload.milestone && { milestone: payload.milestone }),
        ...(payload.labels
          ? {
              labels: [
                ...payload.labels,
                ...(organization!.added_labels ? organization!.added_labels.split(',') : []),
              ],
            }
          : { labels: organization!.added_labels.split(',') }),
      }
    )

    if (updatedIssue && updatedIssue?.status === 200) {
      response.ok({
        issues: updatedIssue.data,
      })
    } else {
      response.internalServerError('An error occurred while updating the issue...')
    }
  }

  public async destroy({ request, response, auth, bouncer }: HttpContextContract) {
    const organization = await auth.user?.related('organization').query().first()
    await bouncer.authorize('githubRequest', organization?.installation_id)

    const deletedIssue: boolean | OctokitResponse<any> = await githubWrapper(
      organization?.installation_id,
      'PATCH /repos/{owner}/{repo}/issues/{issue_number}',
      {
        owner: auth.user?.defaultOrganization,
        repo: auth.user?.defaultRepo,
        issue_number: +request.param('id'),
        state: 'closed',
      }
    )

    if (deletedIssue && deletedIssue?.status === 200) {
      response.ok({
        issues: deletedIssue.data,
      })
    } else {
      response.internalServerError('An error occurred while updating the issue...')
    }
  }
}
