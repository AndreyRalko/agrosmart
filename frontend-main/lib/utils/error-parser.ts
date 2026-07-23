import { getLanguage } from '@/lib/api/client';

interface ApiError {
  [key: string]: string[];
}

const errorTranslations: Record<string, Record<string, { ru: string; kk: string }>> = {
  tag: {
    'Animal with this tag already exists.': {
      ru: 'Животное с этой меткой уже существует',
      kk: 'Бұл белгісі бар жануар әлдеқашан бар'
    }
  },
  no: {
    'Field with this number already exists.': {
      ru: 'Поле с этим номером уже существует',
      kk: 'Бұл нөмірі бар алаң әлдеқашан бар'
    }
  },
  gov_num: {
    'Machinery with this government number already exists.': {
      ru: 'Техника с этим гос. номером уже существует',
      kk: 'Бұл мемлекеттік нөмірі бар техника әлдеқашан бар'
    }
  },
  email: {
    'A user with that email already exists.': {
      ru: 'Пользователь с этим email уже существует',
      kk: 'Бұл email-мен пайдаланушы әлдеқашан бар'
    },
    'Enter a valid email address.': {
      ru: 'Введите корректный email адрес',
      kk: 'Дұрыс email мекенжайын енгізіңіз'
    }
  },
  password: {
    'This password is too short. It must contain at least 8 characters.': {
      ru: 'Пароль слишком короткий. Минимум 8 символов',
      kk: 'Құпия сөз тым қысқа. Кемінде 8 таңба болуы керек'
    },
    'This password is too common.': {
      ru: 'Пароль слишком простой',
      kk: 'Құпия сөз тым қарапайым'
    }
  },
  non_field_errors: {
    'Invalid credentials': {
      ru: 'Неверный логин или пароль',
      kk: 'Логин немесе құпия сөз қате'
    }
  },
  'values.gt': {
    'Must be a float number (e.g. 10.0, 10.5). Integers are not allowed.': {
      ru: 'Значение "больше" должно быть дробным числом (например: 10.0, 10.5)',
      kk: '"Артық" мәні бөлшек сан болуы керек (мысалы: 10.0, 10.5)'
    }
  },
  'values.lt': {
    'Must be a float number (e.g. 10.0, 10.5). Integers are not allowed.': {
      ru: 'Значение "меньше" должно быть дробным числом (например: 10.0, 10.5)',
      kk: '"Кем" мәні бөлшек сан болуы керек (мысалы: 10.0, 10.5)'
    }
  },
  'values.gte': {
    'Must be a float number (e.g. 10.0, 10.5). Integers are not allowed.': {
      ru: 'Значение "больше или равно" должно быть дробным числом (например: 10.0, 10.5)',
      kk: '"Артық немесе тең" мәні бөлшек сан болуы керек (мысалы: 10.0, 10.5)'
    }
  },
  'values.lte': {
    'Must be a float number (e.g. 10.0, 10.5). Integers are not allowed.': {
      ru: 'Значение "меньше или равно" должно быть дробным числом (например: 10.0, 10.5)',
      kk: '"Кем немесе тең" мәні бөлшек сан болуы керек (мысалы: 10.0, 10.5)'
    }
  },
  'values.eq': {
    'Must be a float number (e.g. 10.0, 10.5). Integers are not allowed.': {
      ru: 'Значение "равно" должно быть дробным числом (например: 10.0, 10.5)',
      kk: '"Тең" мәні бөлшек сан болуы керек (мысалы: 10.0, 10.5)'
    }
  },
  'values.ne': {
    'Must be a float number (e.g. 10.0, 10.5). Integers are not allowed.': {
      ru: 'Значение "не равно" должно быть дробным числом (например: 10.0, 10.5)',
      kk: '"Тең емес" мәні бөлшек сан болуы керек (мысалы: 10.0, 10.5)'
    }
  }
};

// Специальные ошибки сервера
const serverErrorMessages: Record<string, { ru: string; kk: string }> = {
  'User has no person.': {
    ru: 'Ваш пользователь не привязан к сотруднику. Обратитесь к администратору для создания профиля сотрудника.',
    kk: 'Сіздің пайдаланушыңыз қызметкерге байланыстырылмаған. Қызметкер профилін жасау үшін әкімшіге хабарласыңыз.'
  },
  'Server returned HTML instead of JSON. Check server logs.': {
    ru: 'Ошибка сервера. Обратитесь к администратору.',
    kk: 'Сервер қатесі. Әкімшіге хабарласыңыз.'
  }
};

export function parseApiError(error: unknown): string {
  const lang = getLanguage() as 'ru' | 'kk';
  
  console.log('Parsing error:', error);
  
  // Если это строка
  if (typeof error === 'string') {
    // Проверяем специальные серверные ошибки
    const serverError = serverErrorMessages[error];
    if (serverError) {
      return serverError[lang];
    }
    return error;
  }

  // Если это объект Error
  if (error instanceof Error) {
    // Сначала проверяем специальные ошибки в сообщении
    for (const [key, translation] of Object.entries(serverErrorMessages)) {
      if (error.message.includes(key)) {
        return translation[lang];
      }
    }

    // Пытаемся распарсить JSON из сообщения
    try {
      const apiError: ApiError = JSON.parse(error.message);
      console.log('Parsed API error:', apiError);
      return formatApiError(apiError, lang);
    } catch (e) {
      // Если не JSON, возвращаем оригинальное сообщение
      return error.message;
    }
  }

  // Если это объект с ошибками
  if (typeof error === 'object' && error !== null) {
    return formatApiError(error as ApiError, lang);
  }

  return lang === 'kk' ? 'Белгісіз қате' : 'Неизвестная ошибка';
}

function formatApiError(apiError: ApiError, lang: 'ru' | 'kk'): string {
  const errors: string[] = [];

  for (const [field, messages] of Object.entries(apiError)) {
    // Если messages это объект (вложенные ошибки, например values.gt)
    if (typeof messages === 'object' && !Array.isArray(messages)) {
      for (const [subField, subMessages] of Object.entries(messages)) {
        const fullField = `${field}.${subField}`;
        
        if (Array.isArray(subMessages)) {
          for (const message of subMessages) {
            const serverError = serverErrorMessages[message];
            if (serverError) {
              errors.push(serverError[lang]);
              continue;
            }

            const translation = errorTranslations[fullField]?.[message];
            if (translation) {
              errors.push(translation[lang]);
            } else {
              errors.push(message);
            }
          }
        }
      }
      continue;
    }

    // Обычная обработка для массивов сообщений
    if (Array.isArray(messages)) {
      for (const message of messages) {
        const serverError = serverErrorMessages[message];
        if (serverError) {
          errors.push(serverError[lang]);
          continue;
        }

        const translation = errorTranslations[field]?.[message];
        
        if (translation) {
          errors.push(translation[lang]);
        } else {
          errors.push(message);
        }
      }
    }
  }

  return errors.join('. ');
}

function getFieldLabel(field: string, lang: 'ru' | 'kk'): string {
  const labels: Record<string, { ru: string; kk: string }> = {
    tag: { ru: 'Метка', kk: 'Белгі' },
    no: { ru: 'Номер', kk: 'Нөмір' },
    gov_num: { ru: 'Гос. номер', kk: 'Мемлекеттік нөмір' },
    email: { ru: 'Email', kk: 'Email' },
    password: { ru: 'Пароль', kk: 'Құпия сөз' },
    lastname: { ru: 'Фамилия', kk: 'Тегі' },
    firstname: { ru: 'Имя', kk: 'Аты' },
    birth_date: { ru: 'Дата рождения', kk: 'Туған күні' },
    hiring_date: { ru: 'Дата найма', kk: 'Жұмысқа қабылданған күні' },
    firing_date: { ru: 'Дата увольнения', kk: 'Жұмыстан шығарылған күні' },
    position_id: { ru: 'Позиция', kk: 'Лауазым' },
    department_id: { ru: 'Департамент', kk: 'Бөлім' },
    breed_id: { ru: 'Порода', kk: 'Тұқым' },
    birthday: { ru: 'Дата рождения', kk: 'Туған күні' },
    daily_yield_litre: { ru: 'Суточный удой', kk: 'Тәуліктік сауым' },
    square: { ru: 'Площадь', kk: 'Аудан' },
    brand_id: { ru: 'Бренд', kk: 'Бренд' },
    type_id: { ru: 'Тип', kk: 'Түрі' },
    year_production: { ru: 'Год выпуска', kk: 'Шығарылған жылы' },
    fat_percent: { ru: 'Жирность', kk: 'Майлылығы' },
    protein_percent: { ru: 'Белок', kk: 'Ақуыз' },
    report_date: { ru: 'Дата отчета', kk: 'Есеп күні' },
    animal_id: { ru: 'Животное', kk: 'Жануар' },
  };

  return labels[field]?.[lang] || field;
}