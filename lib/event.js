const debug = require('debug')('trpg:component:player:event');
const uuid = require('uuid/v1');

exports.roll = function roll(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }

    let sender_uuid = data.sender_uuid;
    let is_private = data.is_private;
    let group_uuid = data.group_uuid;
    let dice_request = data.dice_request;
    let dice = app.dice.roll(dice_request);
    let dice_expression = dice.str;
    let dice_result = dice.value;
    debug('user[%s] roll dice in [%s]:\n%s', sender_uuid, group_uuid, dice_expression);

    let pkg = {
      uuid: uuid(),
      sender_uuid,
      group_uuid,
      is_private,
      dice_request,
      dice_expression,
      dice_result,
      date: new Date(),
    }
    if(group_uuid) {
      socket.broadcast.to(group_uuid).emit('dice::roll', pkg);
    }else {
      socket.broadcast.emit('dice::roll', pkg);
    }

    app.storage.connect(function(db) {
      const DiceLog = db.models.dice_log;
      DiceLog.create(pkg, function(err, log) {
        if(!!err) {
          debug('save dice log failed:\n%O', err);
        }
        db.close();
      })
    })
  }catch(e) {
    debug('roll fail: received data %o \n%O', data, e);
  }
}
