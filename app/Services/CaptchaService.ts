import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'

const validateReCaptcha = async (token: string): Promise<boolean> => {
  return await axios
    .post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${Env.get(
        'RECAPTCHA_SECRET'
      )}&response=${token}`
    )
    .then((response) => {
      return response.data.success
    })
    .catch(() => {
      return false
    })
}

export default validateReCaptcha
