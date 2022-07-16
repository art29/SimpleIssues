/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.post('register', 'AuthController.register')
  Route.post('login', 'AuthController.login')
  Route.post('logout', 'AuthController.logout')
  Route.post('feedback/send', 'FeedbacksController.send')
  Route.group(() => {
    Route.get('organizations', 'OrganizationsController.index')
    Route.post('organizations/activate', 'OrganizationsController.activate')
    Route.post('organizations/add_user', 'OrganizationsController.add_user')
    Route.post('organizations/remove_user', 'OrganizationsController.remove_user')
    Route.post('organizations/change_role', 'OrganizationsController.change_role')
    Route.resource('issues', 'IssuesController').except(['show', 'edit']).apiOnly()
  }).middleware('auth:api')
}).prefix('api')
