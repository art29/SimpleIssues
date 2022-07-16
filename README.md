# SimpleIssues
An easy way to access and modify Github Issues.

Note: This is only the backend part. The front-end is available here: [https://github.com/art29/SimpleIssuesReact](https://github.com/art29/SimpleIssuesReact).

## Reason
While using Github Issues and Zenhub a lot over the past few months, an issue appeared a lot: the fact that I always needed to move client tickets from a ToDo list or spreadsheet up to Github Issues which would take time. This app helps solve this by letting the user write the issues themselves in an easy editor that automatically communicates to the Github API through Github Apps.

## How does it work?
There are a few parts to this project:

### The admin side of things
The Admin side of things is a bit more complicated than the user as you need link your organization or repo to the SimpleIssues App. First, you'll need to install the Github App called SimpleIssues (Coming soon). From there you can select your repo (I recommend you to select only the repo you are planning to use and to only give the Issues Permissions so the App has the less power as possible in case of a security vulnerabilty). Then, the install will redirect to the SimpleIssues website where you'll be able to Login or Signup and from there you'll be able to create the organization. Then, you'll be considered as an admin for that installation. You will be able to add other admins and users from an admin dashboard (available soon).

### The user side of things
The user side is pretty straight forward. You create an account and wait for an admin to add you to the SimpleIssues Organization through their dashboards. Then, you can select the organization you want from the list of available ones you have and select the repo. From there you can see all client issues and even create new ones through an easy interface!

## What did I use to build this
- AdonisJS for the NodeJS Framework
- Github API
- Typescript (Makes the code look cleaner and easier to read in my opinion)
- Prettier
- ESLint

I probably missed some :sweat_smile:, so you can look at the `package.json` file!

## Installation

**Coming Soon**
