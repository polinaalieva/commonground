export const CONTENT = {

  // ===========================
  // HOME PAGE
  // ===========================
  home: {
    en: {
      subtitle_header: 'A map of how people experience places',
      title: 'A map of how people experience places',
      subtitle: 'Tap the map. Share your experience.\nExplore places through people’s experiences.',
      btn_city: 'London',
      btn_suggest: '+ Suggest city',
      body_1: 'Cities collect vast amounts of data.',
      body_2: "Yet people’s lived experience of places often remains fragmented, delayed, and treated as secondary.",
      body_3: 'Common Ground explores what happens when people’s experiences are continuously collected and form a shared layer of understanding about the city.',
      contact: `If you'd like to share feedback about the project, feel free to message me on Telegram`,
    },
    ru: {
      subtitle_header: 'Изучай места через опыт людей',
        title: 'Карта, собранная из опыта людей',
      subtitle: 'Открой карту. Поделись своим опытом.\nИзучай места через опыт других людей.',
      btn_city: 'Лондон',
      btn_suggest: '+ Предложить город',
      body_1: 'Города собирают много данных.',
      body_2: 'Но личный опыт людей, связанный с местами, часто фиксируется поздно, остаётся фрагментарным и второстепенным.',
      body_3: 'Common Ground исследует, что происходит, когда опыт людей собирается непрерывно и складывается в общий слой понимания города.',
      contact: 'Если хочешь поделиться фидбеком о проекте, напиши мне в Telegram',
    },
  },

  // ===========================
  // SUGGEST CITY FORM
  // ===========================
  suggest_city: {
    en: {
      step1_title: '1 / 2  Suggest city',
      description: 'Common Ground is an ongoing project exploring how places feel to people. If there\'s a city you\'d like to see on the map, feel free to suggest it.',
      label_city: 'Suggest city',
      placeholder_city: 'Which city would you like to suggest?',
      label_why: 'Why this city',
      placeholder_why: 'What makes this city interesting?',
      btn_continue: 'Continue',

      step2_title: '2 / 2  Tell about yourself',
      label_relation: 'Do you live in this city?',
      placeholder_relation: 'Select option',
      label_contact: 'Your contact',
      placeholder_contact: 'Telegram, email, or anything comfortable',
      btn_submit: 'Done',

      relation_options: [
        { value: 'live_there', label: 'I live there' },
        { value: 'used_to_live', label: 'I used to live there' },
        { value: 'visit_often', label: 'I visit often' },
        { value: 'interested', label: 'Just interested' },
      ],

      thanks_title: 'Thank you',
      thanks_text: 'Suggestions help shape which cities\nappear next on the map',
      btn_close: 'Close',

      error: 'Something went wrong. Try again.',
    },
    ru: {
      step1_title: '1 / 2  Предложить город',
      description: 'Common Ground — это проект, который исследует, как люди ощущают места. Если хочешь увидеть свой город на карте — предложи его.',
      label_city: 'Город',
      placeholder_city: 'Какой город ты хочешь предложить?',
      label_why: 'Почему этот город',
      placeholder_why: 'Что делает его интересным?',
      btn_continue: 'Продолжить',

      step2_title: '2 / 2  Расскажи о себе',
      label_relation: 'Ты живёшь в этом городе?',
      placeholder_relation: 'Выбери вариант',
      label_contact: 'Контакт',
      placeholder_contact: 'Telegram, email или что удобно',
      btn_submit: 'Готово',

      relation_options: [
        { value: 'live_there', label: 'Живу там' },
        { value: 'used_to_live', label: 'Жил раньше' },
        { value: 'visit_often', label: 'Бываю часто' },
        { value: 'interested', label: 'Просто интересно' },
      ],

      thanks_title: 'Спасибо',
      thanks_text: 'Предложения помогают выбрать,\nкакие города появятся на карте следующими',
      btn_close: 'Закрыть',

      error: 'Что-то пошло не так. Попробуй ещё раз.',
    },
  },

// ===========================
  // MAP PAGE - только здесь variant → lang
  // ===========================
  map: {
    belonging: {
      en: {
        // landing step
        modal_text_mobile: 'See how people experience places',
        modal_text_desktop: 'See how people experience places or share your experience',
        button: 'Share your experience',

        // step 1
        step1_title: '1 / 2  Pick a place on the map',
        step1_subtitle: 'Drag the map to move the pin',
        btn_continue: 'Continue',

        // step 2
        step2_title: '2 / 2  Share your experience',
        question: 'Does this place feel like yours?',
        slider_labels: ['not mine', 'mixed', 'feels like mine'],
        note_label: 'Add a note',
        note_placeholder: 'What makes it feel this way?',
        btn_share: 'Share',
        btn_sharing: 'Sharing...',

        // confirm screen (если нет комментария)
        confirm_title: 'Add a quick note?',
        confirm_text: 'It helps others understand this place better',
        btn_skip: 'Skip',
        btn_add_note: 'Add note',

        // errors
        error: 'Something went wrong. Try again.',

        // map popups
        map_labels: {
          high: 'Feels like mine',
          mid: 'Mixed feelings',
          low: 'Not my place',
        },
      },
      ru: {
        // landing step
        modal_text_mobile: 'Изучай места через опыт людей',
        modal_text_desktop: 'Изучай места через опыт людей или поделись своим опытом',
        button: 'Поделиться опытом',

        // step 1
        step1_title: '1 / 2  Выбери место на карте',
        step1_subtitle: 'Перетащи карту, чтобы переместить пин',
        btn_continue: 'Продолжить',

        // step 2
        step2_title: '2 / 2  Поделись своим опытом',
        question: 'Это место ощущается как своё?',
        slider_labels: ['не моё', 'неоднозначно', 'моё место'],
        note_label: 'Комментарий',
        note_placeholder: 'Что делает его таким для тебя?',
        btn_share: 'Поделиться',
        btn_sharing: 'Отправляем...',

        // confirm screen
        confirm_title: 'Добавить комментарий?',
        confirm_text: 'Это помогает другим лучше понять место',
        btn_skip: 'Пропустить',
        btn_add_note: 'Добавить',

        // errors
        error: 'Что-то пошло не так. Попробуй ещё раз.',

        // map popups
        map_labels: {
          high: 'Моё место',
          mid: 'Неоднозначно',
          low: 'Не моё место',
        },
      },
    },

    living: {
      en: {
        // landing step
        modal_text_mobile: 'See what it\'s like to live in different places',
        modal_text_desktop: 'See what it\'s like to live in different places or share your experience',
        button: 'Share your experience',

        // step 1
        step1_title: '1 / 2  Pick a place on the map',
        step1_subtitle: 'Drag the map to move the pin',
        btn_continue: 'Continue',

        // step 2
        step2_title: '2 / 2  Share your experience',
        question: 'Does this place fit you as a place to live in?',
        slider_labels: ['doesn\'t fit', 'sometimes', 'fits me'],
        note_label: 'Add a note',
        note_placeholder: 'What it\'s like to live here for you',
        btn_share: 'Share',
        btn_sharing: 'Sharing...',

        // confirm screen
        confirm_title: 'Add a quick note?',
        confirm_text: 'It helps others understand this place better',
        btn_skip: 'Skip',
        btn_add_note: 'Add note',

        // errors
        error: 'Something went wrong. Try again.',

        // map popups
        map_labels: {
          high: 'Fits me',
          mid: 'Sometimes fits',
          low: 'Doesn\'t fit me',
        },
      },
      ru: {
        // landing step
        modal_text_mobile: 'Посмотри на места через опыт людей',
        modal_text_desktop: 'Посмотри на места через опыт людей или поделись своим',
        button: 'Поделиться опытом',

        // step 1
        step1_title: '1 / 2  Выбери место на карте',
        step1_subtitle: 'Перетащи карту, чтобы переместить пин',
        btn_continue: 'Продолжить',

        // step 2
        step2_title: '2 / 2 Поделись своим опытом',
        question: 'Подходит ли тебе это место для жизни?',
        slider_labels: ['не подходит', 'по-разному', 'подходит'],
        note_label: 'Комментарий',
        note_placeholder: 'Расскажи, как здесь живётся',
        btn_share: 'Поделиться',
        btn_sharing: 'Отправляем...',

        // confirm screen
        confirm_title: 'Добавить комментарий?',
        confirm_text: 'Это помогает другим лучше понять место',
        btn_skip: 'Пропустить',
        btn_add_note: 'Добавить',

        // errors
        error: 'Что-то пошло не так. Попробуй ещё раз.',

        // map_labels
        map_labels: {
          high: 'Мне подходит',
          mid: 'Иногда подходит',
          low: 'Мне не подходит',
        },
      },
    },

  },
}