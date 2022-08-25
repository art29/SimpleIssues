import Hash from '@ioc:Adonis/Core/Hash'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'
import Mail from '@ioc:Adonis/Addons/Mail'
import Encryption from '@ioc:Adonis/Core/Encryption'
import OrganizationUser from 'App/Models/OrganizationUser'
import OrganizationInvite from 'App/Models/OrganizationInvite'
import Env from '@ioc:Adonis/Core/Env'
import captchaService from 'App/Services/CaptchaService'

export default class AuthController {
  public async register({ request, auth, response }: HttpContextContract) {
    const validationSchema = schema.create({
      name: schema.string({ trim: true }),
      email: schema.string({ trim: true }, [
        rules.email(),
        rules.maxLength(255),
        rules.unique({ table: 'users', column: 'email' }),
      ]),
      password: schema.string({ trim: true }, [rules.confirmed()]),
    })

    const validatedData = await request.validate({
      schema: validationSchema,
    })

    if (request.body().token && (await captchaService(request.body().token))) {
      const user = await User.create(validatedData)
      const invites = await OrganizationInvite.query().where('email', user.email)

      if (invites.length) {
        await OrganizationUser.createMany(
          invites.map((oi) => {
            return {
              email: user.email,
              organization_id: oi.organizationId,
            }
          })
        )

        await OrganizationInvite.query().where('email', user.email).update('active', false)
        User.query().where('user_id', user.id).update('organization_id', invites[0].organizationId)
      }

      const token = await auth.use('api').generate(user)
      return response.json({ user, token })
    } else {
      return response.abort(
        { success: false, error: 'We do not accept bots on this website.' },
        400
      )
    }
  }

  public async logout({ auth }: HttpContextContract) {
    await auth.logout()
  }

  public async login({ request, auth, response }: HttpContextContract) {
    const email = request.input('email')
    const password = request.input('password')

    // Lookup user manually
    const user = await User.query().where('email', email).firstOrFail()

    // Verify password
    if (!(await Hash.verify(user.password, password))) {
      return response.badRequest('Invalid credentials')
    }

    // Generate token
    const token = await auth.use('api').generate(user)
    return response.json({ user, token })
  }

  public async forgot_password({ request, response }: HttpContextContract) {
    const user = await User.query().where('email', request.input('email')).firstOrFail()
    const name = user.name
    const link = `${Env.get('FRONT_END_URL')}/reset_password?hash=${Encryption.encrypt(
      user.id,
      '24 hours'
    )}`

    await Mail.send((msg) => {
      msg
        .from('simpleissues@afetiveau.com')
        .to(user.email)
        .subject('SimpleIssues | Reset your password')
        .htmlView('emails/reset_password', {
          name,
          link,
        })
    })

    response.ok({ success: true })
  }

  public async reset_password({ request, response }: HttpContextContract) {
    const passwordResetSchema = await request.validate({
      schema: schema.create({
        hash: schema.string(),
        password: schema.string({ trim: true }, [rules.confirmed()]),
      }),
    })

    const userId: number | null = Encryption.decrypt(passwordResetSchema.hash)

    if (!userId) {
      return response.badRequest('Invalid hash')
    }

    const user: User = await User.findOrFail(userId)
    user.password = passwordResetSchema.password
    await user.save()

    response.ok({ success: true })
  }

  public async change_password({ request, auth, response }: HttpContextContract) {
    response.abortUnless(auth.user, 'Missing User Id', 500)
    const passwordChangeSchema = await request.validate({
      schema: schema.create({
        old_password: schema.string({ trim: true }),
        password: schema.string({ trim: true }, [rules.confirmed()]),
      }),
    })

    const user: User = await User.findOrFail(auth.user!.id)
    if (!(await Hash.verify(user.password, passwordChangeSchema.old_password))) {
      return response.badRequest('Invalid credentials')
    } else {
      user.password = passwordChangeSchema.password
      await user.save()
      response.ok({ success: true })
    }
  }
}
