import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Mail from '@ioc:Adonis/Addons/Mail'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import validateReCaptcha from 'App/Services/CaptchaService'

export default class FeedbacksController {
  public async send({ request, response }: HttpContextContract) {
    const validationSchema = schema.create({
      name: schema.string({ trim: true }),
      email: schema.string({ trim: true }, [rules.email(), rules.maxLength(255)]),
      message: schema.string(),
      token: schema.string(),
    })

    const validatedData = await request.validate({
      schema: validationSchema,
    })

    if (validatedData.token && (await validateReCaptcha(validatedData.token))) {
      await Mail.send((msg) => {
        msg
          .from('simpleissues@afetiveau.com')
          .to(validatedData.email)
          .cc('simpleissues@afetiveau.com')
          .subject('SimpleIssues | Thank you for your Feedback!')
          .htmlView('emails/feedback', {
            name: validatedData.name,
            message: validatedData.message,
          })
      })

      response.ok({ status: 'ok' })
    } else {
      return response.abort(
        { success: false, error: 'We do not accept bots on this website.' },
        400
      )
    }
  }
}
