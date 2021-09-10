exports.init = {
  start: {
    ko: ['뉴스', '코로나', ['뉴스', 'it뉴스', 'IT뉴스'], '기사'],
    en: ['news', 'covid'],
  },
  end: {
    ko: ['종료', '끝'],
    en: ['end'],
  },
  locale: ['ko'],
  example: {
    ko: [
      '파이보, 뉴스 알려줘.',
      '파이보, IT 뉴스 알려줘.',
      '파이보, 연예 뉴스 알려줘.',
      '파이보, 경제 뉴스 알려줘.',
      '파이보, 사회 뉴스 알려줘.',
      '파이보, 정치 뉴스 알려줘.',
      '파이보, 스포츠 뉴스 알려줘.',
      '파이보, 코로나 상황 알려줘.',
      '파이보, 서귀포 코로나 상황 알려줘.'
    ],
    en: [
      'pi·bo, let me know the news.',
      'pi·bo, tell me the IT news.',
      'pi·bo, tell me the entertainment news.',
      'pi·bo, tell me the economic news.',
      'pi·bo, tell me the social news.',
      'pi·bo, tell me the political news.',
      'pi·bo, tell me the sports news.',
    ],
  },
  title: {
    ko: '뉴스',
    en: 'News',
  },
  description: {
    ko: '파이보가 오늘의 주요 뉴스를 알려줄게.',
    en: "Get today's top news.",
  },
  standalone: false,
  permission: ['camera', 'speak'],
  visible: true,
  type: 0,
  category: 3,
};

exports.node = {
  common: [
    {
      id: 'economy',
      q: {
        ko: ['경제', '경재'],
        en: ['Economy', 'Finance', 'Management'],
      },
      a: {
        ko: [''],
        en: [''],
      },
    },
    {
      id: 'it',
      q: {
        ko: ['아이티', '기술', 'IT', 'it', 'it뉴스', 'IT뉴스'],
        en: ['IT', 'Technology', 'Computer'],
      },
      a: {
        ko: [''],
        en: [''],
      },
    },
    {
      id: 'ent',
      q: {
        ko: ['연예', '연애'],
        en: ['Entertainment', 'Celebrity', 'Broadcasting'],
      },
      a: {
        ko: [''],
        en: [''],
      },
    },
    {
      id: 'social',
      q: {
        ko: ['사회'],
        en: ['Society'],
      },
      a: {
        ko: [''],
        en: [''],
      },
    },
    {
      id: 'politics',
      q: {
        ko: ['정치'],
        en: ['Politics'],
      },
      a: {
        ko: [''],
        en: [''],
      },
    },
    {
      id: 'sports',
      q: {
        ko: ['스포츠'],
        en: ['Sports'],
      },
      a: {
        ko: [''],
        en: [''],
      },
    },
  ],
};
