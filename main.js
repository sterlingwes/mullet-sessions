// handles server bootstrapping

var _ = require('underscore'),
    events = require('events'),
    util = require('util');

module.exports = function(config) {
    
    var sessionNamespace = 'session_'
      , app = config.app
      , sessionConfig = config.sessions;
    
    function SessionState() {
        events.EventEmitter.call(this);
    }
    
    util.inherits(SessionState, events.EventEmitter);
    
    var sessionState = new SessionState;
    
    if(_.size(sessionConfig)) {
    
        var sessions = require('client-sessions'),
            hostMap = {};

        _.each(sessionConfig, function(cfg, cookieName) {

            var sess = {};

            if(typeof cfg === 'string')
                sess.secret = cfg;
            else if(typeof cfg === 'object')
                sess = cfg;

            if(!sess.secret)    return console.error('! No session secret declared in '+cookieName+' session config');

            if(sess.host)
                hostMap[sess.host] = cookieName;
            else
                hostMap._default = cookieName;

            app.use(sessions({
                cookieName:     sessionNamespace + cookieName,
                duration:       sess.duration || ( 24 * 60 * 60 * 1000 ),
                activeDuration: sess.activeDuration || ( 1000 * 60 * 5 ),
                secret:         sess.secret
            }));

            if(typeof sess.middleware === 'function') {
                app.use(sess.middleware);
            }
        });
        
        app.use(function(req,res,next) {
            var host = req.get('host'),

                sessionName = _.find(_.omit(hostMap,'_default'), function(name, regx) {
                    return (new RegExp(regx)).test(host);
                }) || hostMap._default;
            
            if(sessionName) { // TODO: handle multiple sessions (within domains)
                req.currentSession = {
                    name:   sessionName
                };
                
                _.extend(req.currentSession, req[sessionNamespace + sessionName]);
            }
            
            next();
        });

    }
    
    return sessionState;
    
};