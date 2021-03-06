const debug = require('ghost-ignition').debug('services:routing:static-pages-router');
const common = require('../../lib/common');
const urlService = require('../../services/url');
const RSSRouter = require('./RSSRouter');
const controllers = require('./controllers');
const middlewares = require('./middlewares');
const ParentRouter = require('./ParentRouter');

class StaticRoutesRouter extends ParentRouter {
    constructor(mainRoute, object) {
        super('StaticRoutesRouter');

        this.route = {value: mainRoute};
        this.templates = (object.templates || []).reverse();
        this.data = object.data || {query: {}, router: {}};
        debug(this.route.value, this.templates);

        if (this.isChannel(object)) {
            this.filter = object.filter;
            this.limit = object.limit;
            this.order = object.order;

            this.routerName = mainRoute === '/' ? 'index' : mainRoute.replace(/\//g, '');
            this.controller = object.controller;

            debug(this.route.value, this.templates, this.filter, this.data);
            this._registerChannelRoutes();
        } else {
            debug(this.route.value, this.templates);
            this._registerStaticRoute();
        }
    }

    _registerChannelRoutes() {
        this.router().use(this._prepareChannelContext.bind(this));

        // REGISTER: enable rss by default
        this.rssRouter = new RSSRouter();
        this.mountRouter(this.route.value, this.rssRouter.router());

        // REGISTER: channel route
        this.mountRoute(this.route.value, controllers[this.controller]);

        // REGISTER: pagination
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlService.utils.urlJoin(this.route.value, 'page', ':page(\\d+)'), controllers[this.controller]);

        common.events.emit('router.created', this);
    }

    _prepareChannelContext(req, res, next) {
        res.locals.routerOptions = {
            name: this.routerName,
            context: [this.routerName],
            filter: this.filter,
            limit: this.limit,
            order: this.order,
            data: this.data.query,
            templates: this.templates
        };

        res._route = {
            type: this.controller
        };

        next();
    }

    _registerStaticRoute() {
        this.router().use(this._prepareStaticRouteContext.bind(this));
        this.mountRoute(this.route.value, controllers.static);

        common.events.emit('router.created', this);
    }

    _prepareStaticRouteContext(req, res, next) {
        res.locals.routerOptions = {
            data: this.data.query,
            context: []
        };

        res._route = {
            type: 'custom',
            templates: this.templates,
            defaultTemplate: 'default'
        };

        next();
    }

    isChannel(object) {
        if (object && object.controller && object.controller === 'channel') {
            return true;
        }

        return this.controller === 'channel';
    }
}

module.exports = StaticRoutesRouter;
