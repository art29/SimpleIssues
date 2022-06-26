import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { githubWrapper } from 'App/Services/GithubService'
import { schema } from '@ioc:Adonis/Core/Validator'
import { OctokitResponse } from '@octokit/types'

export default class IssuesController {
  private issueSchema = schema.create({
    title: schema.string(),
    body: schema.string(),
    assignees: schema.array.optional().members(schema.string()),
    milestone: schema.number.optional(),
    labels: schema.array.optional().members(schema.string()),
  })

  public async index({ auth, request, response, bouncer }: HttpContextContract) {
    const organization = await auth.user?.related('organization').query().first()
    await bouncer.authorize('githubRequest', organization?.installation_id)

    const issues = await githubWrapper(
      organization?.installation_id,
      'GET /repos/{owner}/{repo}/issues',
      {
        owner: auth.user?.defaultOrganization,
        repo: auth.user?.defaultRepo,
        state: 'open',
        ...(request.qs().labels && { labels: request.qs().labels.join(',') }),
      }
    )

    const labels = await githubWrapper(
      organization?.installation_id,
      'GET /repos/{owner}/{repo}/labels',
      {
        owner: auth.user?.defaultOrganization,
        repo: auth.user?.defaultRepo,
      }
    )

    if (issues && labels) {
      response.ok({
        issues: issues.data,
        labels: labels.data,
        organization: auth.user?.defaultOrganization,
        repo: auth.user?.defaultRepo,
      })
    } else {
      response.internalServerError('An error occurred while getting Github data...')
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
          ? { labels: [...payload.labels, 'client-created'] }
          : { labels: ['client-created'] }),
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
      organization?.installation_id,
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
          ? { labels: [...payload.labels, 'client-created'] }
          : { labels: ['client-created'] }),
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
