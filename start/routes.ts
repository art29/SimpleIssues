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
  Route.post('forgot_password', 'AuthController.forgot_password')
  Route.post('reset_password', 'AuthController.reset_password')
  Route.group(() => {
    Route.get('users/organizations', 'UsersController.organizations')
    Route.post('users/set_organization', 'UsersController.set_organization')
    Route.get('users/repos', 'UsersController.repos')
    Route.post('users/set_repo', 'UsersController.set_repo')
    Route.post('change_password', 'AuthController.change_password')
    Route.get('users/user_info', 'UsersController.user_info')
    Route.get('organizations', 'OrganizationsController.index')
    Route.post('organizations/activate', 'OrganizationsController.activate')
    Route.post('organizations/add_user', 'OrganizationsController.add_user')
    Route.post('organizations/remove_user', 'OrganizationsController.remove_user')
    Route.post('organizations/change_role', 'OrganizationsController.change_role')
    Route.put('organizations/mandatory_labels', 'OrganizationsController.mandatory_labels')
    Route.put('organizations/added_labels', 'OrganizationsController.added_labels')
    Route.resource('issues', 'IssuesController').except(['show', 'edit']).apiOnly()
  }).middleware('auth:api')
}).prefix('api')
