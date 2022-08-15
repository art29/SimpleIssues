import { createAppAuth } from '@octokit/auth-app'
import Env from '@ioc:Adonis/Core/Env'
import * as fs from 'fs'
import { Octokit } from '@octokit/core'
import { join } from 'path'

export const githubLogin = async (installationId: string) => {
  const privateKey: string = fs.readFileSync(
    join(__dirname + '../../../' + '/config/github-private-key.pem'),
    'utf-8'
  )

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: Env.get('GITHUB_APP_ID'),
      privateKey: privateKey,
      clientId: Env.get('GITHUB_CLIENT_ID'),
      clientSecret: Env.get('GITHUB_CLIENT_SECRET'),
      installationId: installationId,
    },
  })
}

export const githubWrapper = async (
  installationId: string | undefined,
  url: string,
  params: any,
  octokit?: Octokit
) => {
  if (octokit) {
    return await octokit.request(url, params)
  } else {
    if (!installationId) {
      return false
    }
    const appOctokit = await githubLogin(installationId)
    return await appOctokit.request(url, params)
  }
}
