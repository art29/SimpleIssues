import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Mail from '@ioc:Adonis/Addons/Mail'

export default class FeedbacksController {
  public async send({ request, response }: HttpContextContract) {
    const email = request.input('email')
    const name = request.input('name')
    const message = request.input('message')

    await Mail.send((msg) => {
      msg
        .from('simpleissues@afetiveau.com')
        .to(email)
        .cc('simpleissues@afetiveau.com')
        .subject('SimpleIssues | Thank you for your Feedback!')
        .htmlView('emails/feedback', {
          name,
          message,
        })
    })

    response.ok({ status: 'ok' })
  }
}
