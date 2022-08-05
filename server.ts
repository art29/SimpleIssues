/*
|--------------------------------------------------------------------------
| AdonisJs Server
|--------------------------------------------------------------------------
|
| The contents in this file is meant to bootstrap the AdonisJs application
| and start the HTTP server to accept incoming connections. You must avoid
| making this file dirty and instead make use of `lifecycle hooks` provided
| by AdonisJs service providers for custom code.
|
*/

import 'reflect-metadata'
import sourceMapSupport from 'source-map-support'
import { Ignitor } from '@adonisjs/core/build/standalone'
import * as Airbrake from '@airbrake/node'
import Env from '@ioc:Adonis/Core/Env'

new Airbrake.Notifier({
  projectId: 440660,
  projectKey: Env.get('AIRBRAKE_PROJECT_ID'),
  environment: Env.get('AIRBRAKE_PROJECT_KEY'),
})

sourceMapSupport.install({ handleUncaughtExceptions: false })

new Ignitor(__dirname).httpServer().start()
