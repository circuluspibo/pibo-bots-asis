const M = require('i18next');
const _ = require('lodash');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync(__dirname + '/config.yml', 'utf8'), {
  json: true,
});
const ko = require('./lang_ko.json');
const en = require('./lang_en.json');
const moment = require('moment');
const util = require('util');
const axios = require('axios');
const NAVER_URL =
  'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode';
const NAVER_ID = '2hqmcff0c3';
const NAVER_KEY = 'fHuZaQE4WZreK0ElNx0rZVCGQU4XapKqNDH37caE';

exports.bot = async (param, api) => {
  const lang = api.config.get('language');
  const robotId = api.bus.robotId;
  const env = api.config.get('env');
  const cfg = config[env];
  const logger = api.logger;
  const token = param.state.token ? param.state.token : ['뉴스'];
  let cmd = param.state.cmd;
  const clientType = cfg.CLIENT_TYPE;
  const moduleNm = cfg.MODULE_NAME;
  let topic = 'total';
  let topicStr = M.t('TOTAL');
  const geoInfo = api.config.get('geo')[0];
  const myCity = geoInfo.address;
  let SIDO = myCity[0];
  const keywordList = param.state.keywords.noun;
  // const covid_list = ['제주', '경남', '경북', '전남', '전북', '충남', '충북', '강원', '경기', '세종', '울산', '대전', '광주', '인천', '대구', '부산', '서울']

  logger.info(
    moduleNm,
    `! beginTime : ${moment().format('YYYY-MM-DDTHH:mm:ss.SSS')}`,
  );
  logger.info(moduleNm, `! robotId : ${robotId}`);
  logger.info(moduleNm, `! environment : ${env}`);
  logger.info(moduleNm, `! param.state.token : ${token}`);
  logger.info(moduleNm, `! param.state.cmd : ${cmd}`);

  console.time('i18next');
  M.init({
    resources: {
      en: {
        bot: ko.OFFICIAL_NEWS,
      },
      ko: {
        bot: ko.OFFICIAL_NEWS,
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

  const clearKeyword = (list) => {
    // 단어로 들어올 때
    _.remove(list, function (str) {
      return (
        str == '테스트' ||
        str == '뉴스' ||
        str == '파' ||
        str == '코로나' ||
        str == '내일' ||
        str == '오늘' ||
        str == '제' ||
        str == '것' ||
        str == '농' ||
        str == '려조' ||
        str == '로조' ||
        str == '이보' ||
        str == '졍' ||
        str == '정보' ||
        str == '상황' ||
        str == '지역'
      );
    });

    // 단어가 쪼개져서 들어올 때
    let keyword = list.join(' ').replace('파이보', '');
    // 남은 keyword가 원하는 단어가 아닐 때
    if (list.includes('종시')) {
      keyword = keyword.replace('종시', '세종시');
    } else if (list.includes('로동')) {
      keyword = keyword.replace('로동', '을지로동');
    } else if (list.includes('한강')) {
      keyword = keyword.replace('한강', '한강로');
    } else if (list.includes('남가')) {
      keyword = keyword.replace('남가', '남가좌');
    } else if (list.includes('북가자')) {
      keyword = keyword.replace('북가자', '북가좌');
    } else if (list.includes('태조야동')) {
      keyword = keyword.replace('태조야동', '무태조야동');
    } else if (list.includes('구')) {
      keyword = keyword.replace('구', '구의');
    } else if (list.includes('방')) {
      keyword = keyword.replace('방', '방이');
    } 

    return keyword;
  };

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

  const piboTellWithoutBg = (tell) => {
    logger.warn(moduleNm, `# piboTell_News : ${tell}`);
    api.pibo.tell(`<speak><prosody rate='70%'>${tell}</prosody></speak>`, {
      lang: lang,
      motion: 'no_h',
    });
  };

  const piboMotion = () => {
    const motions = ['speak', 'hand1', 'cheer', 'hey', 'greeting'];

    api.speak.event((key, data) => {
      if (data.state > 0) {
        const motion = api.util.sample(motions);
        logger.info(moduleNm, `! piboMotion : ${motion}`);
        api.motion(motion);
      }
    });
  };

  // robotId가 undefined 일때
  if (!robotId) {
    logger.error(moduleNm, `# noRobotId`);
    let noRobotId = M.t('NO_ROBOT_ID');
    piboTellWithoutBg(noRobotId);
    return;
  }

  try {
    let covid_data;
    let total_covid_data;
    let mini_SIDO;
    try {
      const covid_keyword = clearKeyword(keywordList);
      logger.info(moduleNm, `get keyword : ${covid_keyword}`);
      if (covid_keyword && token.includes('코로나')) {
        const naver_api = await axios({
          method: 'get',
          url: NAVER_URL,
          params: {
            query: `${covid_keyword}`,
          },
          headers: {
            'Content-Type': 'application/json',
            'X-NCP-APIGW-API-KEY-ID': NAVER_ID,
            'X-NCP-APIGW-API-KEY': NAVER_KEY,
          },
        })
        if (
          !naver_api.data ||
          naver_api.data.errorMessage ||
          naver_api.data.addresses.length === 0
          ) {
            piboTellWithoutBg(M.t('NO_DATA'), lang);
            return;
          } else {
            let addrList = naver_api.data.addresses[0].roadAddress.split(' ');
            SIDO = addrList[0];
          }
        }
      mini_SIDO = SIDO.substring(0,2);
      if (mini_SIDO == '충청' || mini_SIDO == '경상' || mini_SIDO == '전라') {
        mini_SIDO = SIDO.substring(0,1) + SIDO.substring(2,3);
      }
      logger.info(moduleNm, `get covid_data sido : ${mini_SIDO}`);
      const covid_res = await axios({
        method: 'get',
        url: cfg.CAPI_URL+'/v1/covid19',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-client-type': clientType,
          'x-client-id': robotId,
        },
      })
      covid_data = covid_res.data.data.response.body.items.item.filter(val => val.gubun == mini_SIDO)[0];
      total_covid_data = covid_res.data.data.response.body.items.item.filter(val => val.gubun == '합계')[0];
    } catch (err) {
      logger.error(moduleNm, `get covid_data failed : ${err}`);
      covid_data = false
    }
    if (token.includes('코로나')) {
      if (!covid_data) {
        piboTellWithoutBg(M.t('NO_DATA'), lang);
        return;
      } else {
        let pibo_Tell = M.t('COVID', { SIDO: mini_SIDO, total_cnt: total_covid_data.incDec, cnt: covid_data.incDec });
        pibo_Tell += api.util.sample(Object.values(M.t('COVID_CLOSE')));
        api.pibo.tell(`<speak><prosody rate='70%'>${pibo_Tell}</prosody></speak>`, {
          play: {query: {category: 'core', src: 'pibo-resource%sound%news.mp3'}},
          lang: lang,
        });
        // pibo Motion
        piboMotion();
        return;
      }
    }
    const getNewsData = (p_url, p_rId, typeData) => {
      const readNews = (callback) => {
        axios({
          method: 'post',
          url: p_url + '/v1/news',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-client-type': clientType,
            'x-client-id': p_rId,
          },
          data: {
            type: typeData,
          },
        })
          .then(function (res) {
            logger.info(moduleNm, `# getNews.res.status : ${res.status}`);
            callback(null, res.data);
          })
          .catch(function (err) {
            logger.error(moduleNm, `# getNews.err : ${err}`);
            callback(err);
          });
      };
      const newsResult = util.promisify(readNews);
      return newsResult();
    };

    // 시간
    moment.locale(lang);
    const currentDateMonth = moment().format('MMMM');
    const currentDatedate = moment().format('Do');
    let date = M.t('DATE', { month: currentDateMonth, date: currentDatedate });

    // request topic
    if (token.includes('아이티') || token.includes('IT')) {
      topic = 'it';
      topicStr = M.t('IT');
    } else if (token.includes('연예') || token.includes('연애')) {
      topic = 'ent';
      topicStr = M.t('ENTERTAINMENT');
    } else if (token.includes('경제')) {
      topic = 'economy';
      topicStr = M.t('ECONOMY');
    } else if (token.includes('사회')) {
      topic = 'social';
      topicStr = M.t('SOCIAL');
    } else if (token.includes('정치')) {
      topic = 'politics';
      topicStr = M.t('POLITICS');
    } else if (token.includes('스포츠')) {
      topic = 'sports';
      topicStr = M.t('SPORTS');
    } else {
      topic = 'total';
      topicStr = '';
    }
     
      // // request topic
      // switch (cmd) {
      //   case 'economy':
      //     topic = 'economy';
      //     topicStr = M.t('ECONOMY');
      //     break;
      //   case 'ent':
      //     topic = 'ent';
      //     topicStr = M.t('ENTERTAINMENT');
      //     break;
      //   case 'it':
      //     topic = 'it';
      //     topicStr = M.t('IT');
      //     break;
      //   case 'social':
      //     topic = 'social';
      //     topicStr = M.t('SOCIAL');
      //     break;
      //   case 'politics':
      //     topic = 'politics';
      //     topicStr = M.t('POLITICS');
      //     break;
      //   case 'sports':
      //     topic = 'sports';
      //     topicStr = M.t('SPORTS');
      //     break;
      //   default:
      //     topic = 'total';
      //     topicStr = '';
      // }

    if (token) {
      // IT가 cmd로 잘 들어오지 않아 따로 만듦
      if (token.includes('IT') || token.includes('it')) {
        topic = 'it';
        topicStr = M.t('IT');
      }

      // ' 연예'가 cmd로 잘 들어오지 않아 따로 만듦
      if (
        token.includes('연예') ||
        token.includes('연애') ||
        token.includes('연예뉴스') ||
        token.includes('연애뉴스')
      ) {
        topic = 'ent';
        topicStr = M.t('ENTERTAINMENT');
      }
    }

    // 데이터 불러오기
    let newsDatas;
    try {
      const getData = await getNewsData(cfg.CAPI_URL, robotId, topic);
      newsDatas = getData.data;
    } catch (err) {
      logger.error(moduleNm, `# tryGetNewsData.err : ${err}`);
      const errorCode = errorCheck(err.toString());

      let apiErr;
      if (errorCode === 400) {
        apiErr = M.t('API_ERR_400');
      } else {
        apiErr = M.t('API_ERR_500');
      }
      piboTellWithoutBg(apiErr, lang);
      return;
    }

    // 데이터 clean
    let cleanData = [];
    newsDatas.forEach((newsData) => {
      const saveData = cleanText(api.util.cleanText(newsData));
      cleanData.push(saveData);
    });

    // list random sort
    cleanData.sort(function (a, b) {
      return 0.5 - Math.random();
    });

    // 3개의 데이터만 선정
    let threeNewsData = _.sampleSize(cleanData, 3);
    let finalData;

    for (let i = 1; i < 4; i++) {
      if (i === 1) {
        finalData = M.t('TELL_FIRST', { content: threeNewsData[0] });
        finalData += ' <break time="0.5s"/>';
      } else if (i === 2) {
        finalData += M.t('TELL_SECOND', { content: threeNewsData[1] });
        finalData += ' <break time="0.5s"/>';
      } else if (i === 3) {
        finalData += M.t('TELL_THIRD', { content: threeNewsData[2] });
        finalData += ' <break time="0.5s"/>';
      }
    }

    let piboTell = M.t('INTRO', {
      date: date,
      topicStr: topicStr,
    });

    piboTell += ' <break time="0.5s"/>';
    piboTell += finalData;

    if (covid_data && covid_data.incDec > 5) {
      piboTell += M.t('COVID', { SIDO: mini_SIDO, total_cnt: total_covid_data.incDec, cnt: covid_data.incDec });
      piboTell += api.util.sample(Object.values(M.t('COVID_CLOSE')));
    } else {
      piboTell += api.util.sample(Object.values(M.t('CLOSE')));
    }

    // piboTell
    logger.warn(moduleNm, `# piboTell_News : ${piboTell}`);
    api.pibo.tell(`<speak><prosody rate='70%'>${piboTell}</prosody></speak>`, {
      play: '/home/pi/pibo-resource/sound/news.mp3',
      lang: lang,
    });
    // pibo Motion
    piboMotion();

    // default 설정
    threeNewsData = [];
    topic = 'total';
    topicStr = '';
  } catch (err) {
    logger.error(moduleNm, `# logic.err : ${err}`);
  }
};

const cleanText = (text) => {
  let cleanData = text
    .replace(/039;/gi, '')
    .replace(/ARS/gi, '<sub alias="에이알에스">ARS</sub>')
    .replace(/MR/gi, '<sub alias="엠알">MR</sub>')
    .replace(/ - 머니S/gi, '')
    .replace(/- ITDaily/gi, '')
    .split(' | ')[0];

  let cleanData2 = cleanData;
  if (cleanData.includes('기자 -')) {
    cleanData2 = cleanData.split('-')[0];
  }

  return cleanData2;
};
