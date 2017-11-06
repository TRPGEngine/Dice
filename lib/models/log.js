const uuid = require('uuid/v1');

module.exports = function Log(orm, db) {
  let DiceLog = db.define('dice_log', {
    uuid: {type: 'text', required: false},
    sender_uuid: {type: 'text', required: false},
    to_uuid: {type: 'text', required: false},
    is_group: {type: 'boolean'},
    is_private: {type: 'boolean'},
    dice_request: {type: 'text'},
    dice_expression: {type: 'text'},
    dice_result: {type: 'number'},
    date: {type: 'date',time: true},
  }, {
    hooks: {
      beforeCreate: function(next) {
        if (!this.uuid) {
  				this.uuid = uuid();
  			}
  			return next();
      }
    },
    methods: {

    }
  });

  return DiceLog;
}
