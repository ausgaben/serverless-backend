const {JSONLD, JsonWebToken, Link, Status, User} = require('@rheactorjs/models')
const {URIValue, URIValueType} = require('@rheactorjs/value-objects')
const {CheckingAccount, Periodical, Report, Spending, Title} = require('@ausgaben/models')
// const {$context as streamContext} = require( '../api/stream')

/**
 * @param {URIValue} apiBase
 * @return {JSONLD}
 */
exports.relations = apiBase => {
  URIValueType(apiBase, ['relations()', 'apiBase:URIValue'])
  const relations = new JSONLD()

  relations.mapType(User.$context, new URIValue(`${apiBase}/user/:id`))
  relations.mapType(CheckingAccount.$context, new URIValue(`${apiBase}/checking-account/:id`))
  relations.mapType(Spending.$context, new URIValue(`${apiBase}/spending/:id`))
  relations.mapType(Periodical.$context, new URIValue(`${apiBase}/periodical/:id`))

  relations.addIndexLink(new Link(new URIValue(`${apiBase}/status`), Status.$context, false, 'status'))
  relations.addIndexLink(new Link(new URIValue(`${apiBase}/login`), JsonWebToken.$context, false, 'login'))
  relations.addIndexLink(new Link(new URIValue(`${apiBase}/registration`), User.$context, false, 'register'))
  relations.addIndexLink(new Link(new URIValue(`${apiBase}/password-change`), User.$context, false, 'password-change'))
  relations.addIndexLink(new Link(new URIValue(`${apiBase}/password-change/confirm`), User.$context, false, 'password-change-confirm'))
  relations.addIndexLink(new Link(new URIValue(`${apiBase}/activate-account`), User.$context, false, 'activate-account'))
  relations.addIndexLink(new Link(new URIValue(`${apiBase}/avatar`), User.$context, false, 'avatar-upload'))

  relations.addLink(JsonWebToken.$context, new Link(new URIValue(`${apiBase}/token/verify`), JsonWebToken.$context, false, 'token-verify'))
  relations.addLink(JsonWebToken.$context, new Link(new URIValue(`${apiBase}/token/renew`), JsonWebToken.$context, false, 'token-renew'))

  relations.addIndexLink(new Link(new URIValue(`${apiBase}/checking-account`), CheckingAccount.$context, false, 'create-checking-account'))
  relations.addLink(User.$context, new Link(new URIValue(`${apiBase}/checking-account/search`), CheckingAccount.$context, true, 'my-checking-accounts'))
  relations.addLink(User.$context, new Link(new URIValue(`${apiBase}/user/:id/email-change`), User.$context, false, 'change-email'))
  relations.addLink(User.$context, new Link(new URIValue(`${apiBase}/user/:id/email-change/confirm`), User.$context, false, 'change-email-confirm'))
  relations.addLink(User.$context, new Link(new URIValue(`${apiBase}/user/:id/email`), User.$context, false, 'update-email'))
  relations.addLink(User.$context, new Link(new URIValue(`${apiBase}/user/:id/active`), User.$context, false, 'update-active'))
  relations.addLink(User.$context, new Link(new URIValue(`${apiBase}/user/:id/firstname`), User.$context, false, 'update-firstname'))
  relations.addLink(User.$context, new Link(new URIValue(`${apiBase}/user/:id/lastname`), User.$context, false, 'update-lastname'))

  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/spending/search`), Spending.$context, true, 'spendings'))
  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/titles/search`), Title.$context, true, 'titles'))
  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/spending`), Spending.$context, false, 'create-spending'))
  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/periodical/search`), Periodical.$context, true, 'periodicals'))
  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/periodical`), Periodical.$context, false, 'create-periodical'))
  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/monthly`), CheckingAccount.$context, false, 'update-monthly'))
  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/currency`), CheckingAccount.$context, false, 'update-currency'))
  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/savings`), CheckingAccount.$context, false, 'update-savings'))
  relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/report`), Report.$context, false, 'report'))
  // relations.addLink(CheckingAccount.$context, new Link(new URIValue(`${apiBase}/checking-account/:id/stream`), streamContext, false, 'stream'))

  return relations
}
