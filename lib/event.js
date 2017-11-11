const debug = require('debug')('trpg:component:dice:event');
const uuid = require('uuid/v1');

let rolldiceAsync = async function(data) {
  let app = this;
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
  debug('user[%s] roll dice in [%s]:\n%s', sender_uuid, to_uuid, dice_expression);

  let db = await app.storage.connectAsync();
  let log = await db.models.dice_log.createAsync({
    uuid: uuid(),
    sender_uuid,
    to_uuid,
    is_group,
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
    let log = await rolldiceAsync.call(app, data);

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
    if(!to_uuid || is_group === undefined || !dice_request || !reason) {
      cb({result: false, msg: '缺少必要参数'});
      return;
    }
    let chatLog = app.chat.sendMsg(sender_uuid, to_uuid, {
      message: `${player.user.getName()} 因为 ${reason} 请求投骰: ${dice_request}`,
      room: is_group ? to_uuid : '',
      type: 'card',
      is_public: is_group,
      data: {
        type: 'diceRequest',
        title: '投骰请求',
        is_accept: false,
        dice_request,
      }
    })
    cb({result: true, pkg: chatLog});
  }catch(err) {
    cb({result: false, msg: err.toString()})
  }
}

exports.acceptDiceRequest = async function acceptDiceRequest(data, cb) {
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

    let msg_card_uuid = data.msg_card_uuid;
    let diceRequestMsgInfo = await app.chat.findMsgAsync(msg_card_uuid);
    if(diceRequestMsgInfo && diceRequestMsgInfo.data) {
      // TODO 接受权限检测
      diceRequestMsgInfo.data.is_accept = true;
      let chat_log = await app.chat.updateMsgAsync(diceRequestMsgInfo.uuid, diceRequestMsgInfo);
      let rollResult = await rolldiceAsync.call(app, {
        sender_uuid: diceRequestMsgInfo.sender_uuid,
        to_uuid: diceRequestMsgInfo.to_uuid,
        is_group: !!diceRequestMsgInfo.room,
        is_private: !diceRequestMsgInfo.is_public,
        dice_request: diceRequestMsgInfo.data.dice_request,
      })
      app.dice.sendDiceResult(rollResult.sender_uuid, rollResult.to_uuid, rollResult.is_group, chat_log.message + ' 结果:' + rollResult.dice_expression);
      cb({result: true, log: chat_log});
    }else {
      cb({result: false, msg: '非法数据'});
    }
  }catch(err) {
    cb({result: false, msg: err.toString()})
  }
}
