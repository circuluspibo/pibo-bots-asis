const M = require('i18next');
const _ = require('lodash');
const yaml = require('js-yaml');
const fs = require('fs');
const axios = require('axios');
const util = require('util');
const wget = require('node-wget');
const moment = require('moment');
const Josa = require('josa-js');
const config = yaml.load(fs.readFileSync(__dirname + '/config.yml', 'utf8'), {
  json: true,
});
const ko = require('./lang_ko.json');
const en = require('./lang_en.json');

const types = {
  기본_인트로: {
    type: 'intro_basic',
  },
  기본: {
    type: 'basic',
  },
  아침: {
    type: 'morning',
  },
  저녁: {
    type: 'evening',
  },
  근육: {
    type: 'activity_1',
  },
  바디: {
    type: 'activity_2',
  },
  복식: {
    type: 'activity_3',
  },
  빛: {
    type: 'activity_4',
  },
  호흡마음챙김: {
    type: 'activity_5',
  },
};

exports.bot = async (param, api) => {
  const lang = api.config.get('language');
  const userNickName = api.bus.nickName;
  const robotId = api.bus.robotId;
  const env = api.config.get('env');
  const cfg = config[env];
  const logger = api.logger;
  const moduleNm = cfg.MODULE_NAME;
  const clientType = cfg.CLIENT_TYPE;
  const piboInpuText = param.state.text ? param.state.text : '명상';
  const url = cfg.CAPI_URL + '/v1/audio';
  // const headers = {
  //   'Content-Type': 'audio/mpeg',
  //   Accept: 'application/octet-stream',
  //   'x-client-type': clientType,
  //   'x-client-id': robotId,
  // };

  //
  // 봇 정보 //
  logger.info(
    moduleNm,
    `$ beginTime : ${moment().format('YYYY-MM-DDTHH:mm:ss.SSS')}`,
  );
  logger.info(moduleNm, `! environment : ${env}`);
  // logger.info(moduleNm, `! clientType : ${clientType}`);
  // logger.info(moduleNm, `! robotId : ${robotId}`);
  logger.info(moduleNm, `! param.text : ${piboInpuText}`);

  console.time('i18next');
  M.init({
    resources: {
      en: {
        bot: ko.OFFICIAL_MEDITATION,
      },
      ko: {
        bot: ko.OFFICIAL_MEDITATION,
      },
    },
    lng: lang,
    fallbackLng: lang,
    debug: false,
    ns: ['bot'],
    defaultNS: 'bot',
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
    returnedObjectHandler: true,
    joinArrays: true,
    keySeparator: true,
  });
  console.timeEnd('i18next');

  const errorCheck = (text) => {
    let e = text.split(' ');
    let errorCode = Number(e.pop());
    let code;

    if (errorCode >= 400 && errorCode < 500) {
      code = 400;
    } else {
      code = 500;
    }

    return code;
  };

  const choiceTell = (ObjectTell) => {
    let tell = api.util.sample(Object.values(ObjectTell));
    return tell;
  };

  const piboTell = (tell, music, lang) => {
    logger.warn(moduleNm, `# piboTell_Meditation : ${tell}`);
    api.pibo.tell(`<speak><prosody rate='70%'>${tell}</prosody></speak>`, {
      lang: lang,
      play: {query: {category: 'core', src: music}},
      motion: 'breath3',
    });
  };

  const piboTellWithoutBg = (tell, lang) => {
    logger.warn(moduleNm, `# piboTell_Meditation : ${tell}`);
    api.pibo.tell(`<speak><prosody rate='70%'>${tell}</prosody></speak>`, {
      lang: lang,
      motion: 'speak',
    });
  };

  const piboMotion = () => {
    const motions = ['speak', 'greeting', 'hand1'];

    api.speak.event((key, data) => {
      if (data.state > 0) {
        const motion = api.util.sample(motions);
        logger.info(moduleNm, `! piboMotion : ${motion}`);
        api.motion(motion);
      }
    });
  };

  const error = (err) => {
    logger.error(moduleNm, `# tryGetFile.err :  ${err}`);
    let errorCode = errorCheck(err.toString());

    let apiErr;
    if (errorCode === 400) {
      apiErr = M.t('API_ERR_400');
    } else {
      apiErr = M.t('API_ERR_500');
    }
    piboTellWithoutBg(apiErr, 0);
    return;
  };

  const getMeditationVID = (type) => {
    const getVID = (callback) => {
      const gen = encodeURIComponent(type);
      axios({
        method: 'get',
        url: url,
        headers: {
          'x-client-type': clientType,
          'x-client-id': robotId,
        },
        params: {
          'category': 'meditation',
          'genre': gen,
        },
      })
        .then(function (res) {
          logger.info(moduleNm, `# getVID.res.status: ${res.status}`);
          callback(null, res.data);
        })
        .catch(function (err) {
          logger.error(moduleNm, `# getVID.err : ${err}`);
          callback(err);
        });
    };
    const MeditationVID = util.promisify(getVID);
    return MeditationVID();
  };


  const plusJosa = (name) => {
    const josa = Josa.c(name, '이/가');
    const nameWithJosa = josa === '이' ? name + josa : name;
    return nameWithJosa;
  };

  const showDisplay = (title, len, cb) => {
    const T = title.replace(/_/gi, ' ') + '                 ';
    const minute = parseInt(len / 60).toString();
    const second = parseInt(len % 60).toString();

    const M = minute.length === 1 ? '0' + minute : minute;
    const S = second.length === 1 ? '0' + second : second;

    api.heart.top(T);
    api.heart.bottom(`${M}:${S}`);
    api.play.event((key, data) => {
      api.heart.bottom(data.time);
      // if (data.time === '00:00') {
      //   cb();
      // }
    });
  };

  const closeType = (type) => {
    switch (type) {
      case 'basic':
        return 'CLOSE_BASIC';

      case 'morning':
        return 'CLOSE_MORNING';

      case 'evening':
        return 'CLOSE_EVENING';

      default:
        return 'CLOSE_ACTIVITY';
    }
  };

  const introType = (type) => {
    switch (type) {
      case 'basic':
        return 'INTRO_BASIC';

      case 'morning':
        return 'INTRO_BASIC';

      case 'evening':
        return 'INTRO_BASIC';

      default:
        return 'INTRO_ACTIVITY';
    }
  };

  let type =
    Number(moment().format('HH')) < 11
      ? 'morning'
      : Number(moment().format('HH')) > 20
      ? 'evenig'
      : 'basic';

  if (piboInpuText.includes('아침')) {
    type = 'morning';
  } else if (piboInpuText.includes('저녁')) {
    type = 'evening';
  } else if (piboInpuText.includes('바디')) {
    type = types['바디'].type;
  } else if (piboInpuText.includes('빛줄기') || piboInpuText.includes('줄기')) {
    type = types['빛'].type;
  } else if (piboInpuText.includes('근육')) {
    type = types['근육'].type;
  } else if (piboInpuText.includes('복식')) {
    type = types['복식'].type;
  } else if (piboInpuText.includes('마음')) {
    type = types['호흡마음챙김'].type;
  }

  let Meditations;
  let title = undefined;
  let len = undefined;
  const intro = M.t(introType(type));
  const close = choiceTell(
    M.t(closeType(type), { nickName: plusJosa(userNickName) }),
  );

  const getVid = () => {
    return new Promise(async function (resolve, reject) {
      try {
        Meditations = await getMeditationVID(type);
      } catch (err) {
        error(err);
        return;
      }

      title = Meditations.metadata.title;
      len = Meditations.metadata.len;
      logger.info(moduleNm, `! TITLE : ${title}`);
      logger.info(moduleNm, `! LEN : ${len}`);

      resolve();
    });
  };

  // const getContent = () => {
  //   wget(
  //     {
  //       url: Meditations.data,
  //       headers: headers,
  //       dest: '/home/pi/bot/meditation.mp3',
  //     },
  //     (err, data) => {
  //       if (err) {
  //         error(err);
  //       }
  //       return;
  //     },
  //   );
  // };

  const introPlay = () => {
    return new Promise(function (resolve, reject) {
      piboTell(
        intro,
        'pibo-resource%music%meditation_opening_bgm.mp3',
        lang,
      );
      resolve();
    });
  };

  const contentPlay = () => {
    return new Promise(function (resolve, reject) {
      api.pibo.play({query: {category: 'meditation', src:Meditations.metadata.src}}, {
        motion: 'breath_long',
        volume: 2,
      }).then(data => {
        logger.info(moduleNm, `! playdata : ${data}`);
      })
      showDisplay(title, len, resolve);
    });
  };

  const closePlay = () => {
    return new Promise(function (resolve, reject) {
      piboTellWithoutBg(close, lang);
    });
  };

  getVid()
    .then(introPlay)
    .then(contentPlay)
    .then(closePlay)
    .catch((err) => {
      error(err);
    });
};

exports.end = (param, api) => {
  console.log('Ending meditation!');
  api.motion.stop();
  api.heart.off();
};