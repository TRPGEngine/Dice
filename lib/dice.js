const debug = require('debug')('trpg:component:dice');
const event = require('./event');

module.exports = function DiceComponent(app) {
  initStorage.call(app);
  initFunction.call(app);
  initSocket.call(app);
}

function initStorage() {
  let app = this;
  let storage = app.storage;
  storage.registerModel(require('./models/log.js'));

  app.on('initCompleted', function(app) {
    // 数据信息统计
    debug('storage has been load 1 player db model');
  });
}

function initFunction() {
  let app = this;
  app.dice = {
    rollPoint: function rollPoint(maxPoint, minPoint = 1) {
      maxPoint = parseInt(maxPoint);
      if(maxPoint<=1) {
        maxPoint = 100;
      }
      if(maxPoint < minPoint) {
        maxPoint = minPoint + 1;
      }

      var range = maxPoint - minPoint;
      var rand = Math.random();
      return (minPoint + Math.round(rand * range));
    },
    roll: function roll(requestStr) {
      try {
        let pattern = /(\d*)\s*d\s*(\d*)/ig;

        requestStr = requestStr.replace(/[^\dd\+-\/\*]+/ig, '');//去除无效或危险字符
        let express = requestStr.replace(pattern, function(tag, num, dice) {
          num = num || 1;
          dice = dice || 100;
          let res = [];
          for (var i = 0; i < num; i++) {
            res.push(app.dice.rollPoint(dice));
          }

          if(num > 1) {
            return "("+res.join('+')+")";
          }else {
            return res.join('+');
          }
        });

        let result = eval(express);
        let str = requestStr + "=" + express + "=" + result;
        return {
          result: true,
          str,
          value: result
        };
      }catch(err) {
        debug('dice error :'+ err);
        return {
          result: false,
          str:'投骰表达式错误，无法进行运算',
        };
      }
    }
  }
}

function initSocket() {
  let app = this;

  app.on('connection', function(socket) {
    let wrap = {app, socket};
    socket.on('dice::roll', event.roll.bind(wrap));
  });
}
