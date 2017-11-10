const debug = require('debug')('trpg:component:player:event');
const uuid = require('uuid/v1');

let rolldiceAsync = async function(data) {
  let {
    sender_uuid,
    to_uuid,
    is_group,
    is_private,
    dice_request,
  } = data;

  let dice = app.dice.roll(dice_request);
  let dice_expression = dice.str;
  let dice_result = dice.value;
  debug('user[%s] roll dice in [%s]:\n%s', sender_uuid, group_uuid, dice_expression);

  let db = await app.storage.connectAsync();
  let log = await db.models.dice_log({
    uuid: uuid(),
    sender_uuid,
    group_uuid,
    is_private,
    dice_request,
    dice_expression,
    dice_result,
    date: new Date(),
  });
  db.close();
  return log;
}

exports.roll = async function roll(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }

    let { is_group, to_uuid } = data;
    let log = await rolldiceAsync(data);

    if(is_group) {
      socket.broadcast.to(to_uuid).emit('dice::roll', log);
    }else {
      socket.broadcast.emit('dice::roll', pkg);
    }
  }catch(err) {
    cb({result: false, msg: err.toString()})
  }
}

exports.sendDiceRequest = async function sendDiceRequest(data, cb) {
  let app = this.app;
  let socket = this.socket;

  try {
    if(!app.chat) {
      debug('[DiceComponent] need [ChatComponent]');
      return;
    }

    let player = app.player.list.find(socket);
    if(!player) {
      cb({result: false, msg: '用户不存在，请检查登录状态'});
      return;
    }
    let sender_uuid = player.user.uuid;
    let {to_uuid, is_group, dice_request, reason} = data;
    let chatLog = app.chat.sendMsg(sender_uuid, to_uuid, {
      message: `${player.user.getName()} 因为 ${reason} 请求投骰: ${dice_request}`,
      room: is_group ? to_uuid : '',
      type: 'card',
      is_public: is_group,
      data: {
        type: 'diceRequest',
        title: '投骰请求'
      }
    })
    cb({result: true, pkg: chatLog});
  }catch(err) {
    cb({result: false, msg: err.toString()})
  }
}
