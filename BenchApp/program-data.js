// ============================================================
// ПРОГРАММА ТРЕНИРОВОК "КЛУБ 100 КГ" — 9 НЕДЕЛЬ
// ============================================================
// Формат данных:
// isBase: true — базовое упражнение (отдых 3-5 мин)
// isBase: false — подсобка (отдых 1-2 мин)
// segments: [{ percent, reps, sets }] — подходы с % от максимума
// isIndividual: true — вес подбирается индивидуально
// isBodyweight: true — без дополнительного веса
// isSpecial: true — особый формат (напр. "50 подтягиваний")
// superset: { ... } — суперсет с другим упражнением
// note: "..." — дополнительная заметка
// ============================================================

const PROGRAM = [
  // ==================== НЕДЕЛЯ 1 ====================
  {
    week: 1,
    title: "Начало...",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [{ percent: 75, reps: 5, sets: 5 }]
          },
          {
            name: "Разводка гантелей лежа на скамье",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 4
          },
          {
            name: "Жим штанги узким хватом",
            isBase: true,
            segments: [{ percent: 65, reps: 6, sets: 4 }]
          },
          {
            name: "Сгибание штанги на бицепс",
            isBase: false,
            isIndividual: true,
            reps: 12,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isBodyweight: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Ср",
        exercises: [
          {
            name: "Жим штанги лежа на скамье 30\u00B0",
            isBase: true,
            segments: [{ percent: 55, reps: 6, sets: 5 }]
          },
          {
            name: "Отжимания на брусьях",
            isBase: true,
            isIndividual: true,
            reps: 15,
            sets: 4
          },
          {
            name: "Вертикальная тяга блока к груди",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 4
          },
          {
            name: "Разгибание бедра в тренажере",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 4
          },
          {
            name: "Гиперэкстензия",
            isBase: false,
            isIndividual: true,
            reps: 20,
            sets: 4
          },
          {
            name: "Прощание с залом",
            isBase: false,
            isSpecial: true,
            totalReps: 50,
            note: "Подтянуться 50 раз за любое количество подходов"
          },
          {
            name: "Пресс",
            isBase: false,
            isBodyweight: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Пт",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [{ percent: 75, reps: 6, sets: 5 }]
          },
          {
            name: "Жим штанги сидя",
            isBase: true,
            segments: [{ percent: 40, reps: 15, sets: 4 }]
          },
          {
            name: "Разводка гантелей лежа на скамье 30\u00B0",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 4
          },
          {
            name: "Сгибание на бицепс обратным хватом",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isBodyweight: true,
            reps: 20,
            sets: 4
          }
        ]
      }
    ]
  },

  // ==================== НЕДЕЛЯ 2 ====================
  {
    week: 2,
    title: "Ты уже на пути!",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [{ percent: 70, reps: 6, sets: 4 }]
          },
          {
            name: "Разводка гантелей лежа на скамье",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Жим гантелей сидя",
            isBase: true,
            isIndividual: true,
            reps: 8,
            sets: 4
          },
          {
            name: "Сгибание штанги на бицепс",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Ср",
        exercises: [
          {
            name: "Жим штанги стоя",
            isBase: true,
            segments: [{ percent: 55, reps: 6, sets: 5 }]
          },
          {
            name: "Разгибания на трицепс в блоке",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Горизонтальная тяга блока к поясу",
            isBase: false,
            isIndividual: true,
            reps: 12,
            sets: 5
          },
          {
            name: "Приседания с гирей",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Гиперэкстензия",
            isBase: false,
            isBodyweight: true,
            reps: 20,
            sets: 4
          },
          {
            name: "Прощание с залом",
            isBase: false,
            isSpecial: true,
            totalReps: 50,
            note: "Подтянуться 50 раз за любое количество подходов"
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Пт",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 70, reps: 4, sets: 2 },
              { percent: 80, reps: 5, sets: 3 }
            ]
          },
          {
            name: "Разводка гантелей лежа на скамье 30\u00B0",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Жим штанги лежа широким хватом",
            isBase: true,
            segments: [{ percent: 70, reps: 5, sets: 4 }]
          },
          {
            name: "Сгибание на бицепс обратным хватом",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      }
    ]
  },

  // ==================== НЕДЕЛЯ 3 ====================
  {
    week: 3,
    title: "Первые успехи",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 60, reps: 6, sets: 2 },
              { percent: 70, reps: 5, sets: 2 },
              { percent: 80, reps: 5, sets: 4 }
            ]
          },
          {
            name: "Разводка гантелей лежа на скамье",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Жим штанги лежа средним хватом",
            isBase: true,
            segments: [{ percent: 65, reps: 6, sets: 5 }]
          },
          {
            name: "Сгибание штанги на бицепс",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 6
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 4
          }
        ]
      },
      {
        day: "Ср",
        exercises: [
          {
            name: "Жим штанги лежа на скамье 30\u00B0",
            isBase: true,
            segments: [{ percent: 60, reps: 6, sets: 5 }]
          },
          {
            name: "Жим гантелей сидя",
            isBase: true,
            isIndividual: true,
            reps: 10,
            sets: 4
          },
          {
            name: "Вертикальная тяга блока к груди",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 4,
            superset: {
              name: "Горизонтальная тяга блока к поясу",
              isIndividual: true,
              reps: 10,
              sets: 4
            }
          },
          {
            name: "Разгибание бедра в тренажере",
            isBase: false,
            isIndividual: true,
            reps: 20,
            sets: 4
          },
          {
            name: "Приседания без веса",
            isBase: false,
            isBodyweight: true,
            reps: 20,
            sets: 4
          },
          {
            name: "Гиперэкстензия",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Пт",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [{ percent: 75, reps: 8, sets: 2 }]
          },
          {
            name: "Отжимания на брусьях",
            isBase: true,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Сгибание на бицепс обратным хватом",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 6
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      }
    ]
  },

  // ==================== НЕДЕЛЯ 4 ====================
  {
    week: 4,
    title: "Середина пути",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 60, reps: 5, sets: 2 },
              { percent: 70, reps: 4, sets: 2 },
              { percent: 80, reps: 3, sets: 2 },
              { percent: 85, reps: 2, sets: 5 }
            ]
          },
          {
            name: "Разводка гантелей лежа на скамье",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Жим гантелей лежа",
            isBase: true,
            segments: [{ percent: 77, reps: 5, sets: 5 }]
          },
          {
            name: "Сгибание на бицепс с гантелями",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Ср",
        exercises: [
          {
            name: "Жим штанги сидя",
            isBase: true,
            segments: [{ percent: 50, reps: 6, sets: 5 }]
          },
          {
            name: "Махи гантелей в сторону",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Вертикальная тяга блока к груди",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5,
            note: "Ширина хвата та же, что и в жиме лежа"
          },
          {
            name: "Разгибание бедра в тренажере",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 5
          },
          {
            name: "Гиперэкстензия",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 4
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Пт",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 60, reps: 9, sets: 1 },
              { percent: 65, reps: 8, sets: 1 },
              { percent: 70, reps: 6, sets: 1 },
              { percent: 75, reps: 5, sets: 1 },
              { percent: 80, reps: 4, sets: 1 },
              { percent: 85, reps: 4, sets: 1 },
              { percent: 90, reps: 2, sets: 1 },
              { percent: 85, reps: 3, sets: 1 },
              { percent: 80, reps: 3, sets: 1 },
              { percent: 70, reps: 5, sets: 1 },
              { percent: 60, reps: 8, sets: 1 }
            ]
          },
          {
            name: "Разводка гантелей лежа на скамье 30\u00B0",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 6
          },
          {
            name: "Сгибание на бицепс обратным хватом",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      }
    ]
  },

  // ==================== НЕДЕЛЯ 5 ====================
  {
    week: 5,
    title: "По ту сторону экватора",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 70, reps: 4, sets: 2 },
              { percent: 80, reps: 3, sets: 2 },
              { percent: 85, reps: 3, sets: 2 },
              { percent: 90, reps: 2, sets: 5 }
            ]
          },
          {
            name: "Жим штанги лежа с бруском",
            isBase: true,
            segments: [
              { percent: 90, reps: 3, sets: 1 },
              { percent: 95, reps: 2, sets: 1 },
              { percent: 100, reps: 2, sets: 1 }
            ]
          },
          {
            name: "Отжимания узким хватом",
            isBase: true,
            isIndividual: true,
            reps: 20,
            sets: 4
          },
          {
            name: "Сгибание штанги на бицепс",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 20,
            sets: 4
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Ср",
        exercises: [
          {
            name: "Разгибание бедра в тренажере",
            isBase: false,
            isIndividual: true,
            reps: 20,
            sets: 4
          },
          {
            name: "Приседания без веса на лавку",
            isBase: false,
            isBodyweight: true,
            reps: 15,
            sets: 4
          },
          {
            name: "Жим гантелей на скамье 30\u00B0",
            isBase: true,
            segments: [{ percent: 60, reps: 6, sets: 5 }]
          },
          {
            name: "Жим штанги стоя",
            isBase: true,
            isIndividual: true,
            reps: 8,
            sets: 4
          },
          {
            name: "Махи гантелей в сторону",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 4
          },
          {
            name: "Вертикальная тяга блока к груди",
            isBase: false,
            isIndividual: true,
            reps: 20,
            sets: 5
          },
          {
            name: "Гиперэкстензия",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          }
        ]
      },
      {
        day: "Пт",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 80, reps: 4, sets: 2 },
              { percent: 85, reps: 5, sets: 3 }
            ]
          },
          {
            name: "Разводка гантелей лежа на скамье",
            isBase: false,
            isIndividual: true,
            reps: 6,
            sets: 5
          },
          {
            name: "Жим штанги узким хватом",
            isBase: true,
            segments: [{ percent: 65, reps: 5, sets: 5 }]
          },
          {
            name: "Сгибание на бицепс обратным хватом",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      }
    ]
  },

  // ==================== НЕДЕЛЯ 6 ====================
  {
    week: 6,
    title: "Успех уже близко",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 75, reps: 4, sets: 2 },
              { percent: 85, reps: 2, sets: 8 }
            ]
          },
          {
            name: "Разводка гантелей лежа на скамье",
            isBase: false,
            isIndividual: true,
            reps: 6,
            sets: 5
          },
          {
            name: "Жим гантелей лежа",
            isBase: true,
            isIndividual: true,
            reps: 5,
            sets: 5
          },
          {
            name: "Сгибание штанги на бицепс",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 4,
            note: "+2 негативных подхода с меньшим весом"
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 20,
            sets: 4
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Ср",
        exercises: [
          {
            name: "Разгибание бедра в тренажере",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Приседания без веса на лавку",
            isBase: false,
            isBodyweight: true,
            reps: 30,
            sets: 5
          },
          {
            name: "Жим гантелей сидя",
            isBase: true,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Махи гантелей в сторону",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 4
          },
          {
            name: "Вертикальная тяга блока к груди",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5,
            note: "Ширина хвата та же, что и в жиме лежа"
          },
          {
            name: "Гиперэкстензия",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 4
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Пт",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 70, reps: 6, sets: 2 },
              { percent: 80, reps: 3, sets: 4 },
              { percent: 90, reps: 2, sets: 3 },
              { percent: 85, reps: 3, sets: 3 }
            ]
          },
          {
            name: "Разводка гантелей лежа на скамье 30\u00B0",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 6
          },
          {
            name: "Сгибание на бицепс обратным хватом",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      }
    ]
  },

  // ==================== НЕДЕЛЯ 7 ====================
  {
    week: 7,
    title: "Ты в одном шаге",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 70, reps: 4, sets: 2 },
              { percent: 80, reps: 3, sets: 2 },
              { percent: 90, reps: 2, sets: 2 },
              { percent: 95, reps: 1, sets: 2 }
            ]
          },
          {
            name: "Жим штанги лежа с бруском",
            isBase: true,
            segments: [{ percent: 100, reps: 1, sets: 2 }]
          },
          {
            name: "Жим гантелей лежа на скамье 30\u00B0",
            isBase: true,
            isIndividual: true,
            reps: 8,
            sets: 4
          },
          {
            name: "Разгибания на трицепс в блоке",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Сгибание штанги на бицепс",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 4
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Ср",
        exercises: [
          {
            name: "Приседания с гирей",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Разгибание бедра в тренажере",
            isBase: false,
            isIndividual: true,
            reps: 5,
            sets: 3
          },
          {
            name: "Махи гантелей в сторону",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Вертикальная тяга блока к груди",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5,
            superset: {
              name: "Горизонтальная тяга блока к поясу",
              isIndividual: true,
              reps: 10,
              sets: 5
            }
          },
          {
            name: "Гиперэкстензия",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 4
          }
        ]
      },
      {
        day: "Пт",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 75, reps: 2, sets: 4 },
              { percent: 85, reps: 4, sets: 4 }
            ]
          },
          {
            name: "Разводка гантелей лежа на скамье",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Жим штанги узким хватом",
            isBase: true,
            segments: [{ percent: 65, reps: 6, sets: 4 }]
          },
          {
            name: "Сгибание на бицепс обратным хватом",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      }
    ]
  },

  // ==================== НЕДЕЛЯ 8 ====================
  {
    week: 8,
    title: "Шлифовка результата",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [{ percent: 80, reps: 5, sets: 4 }],
            superset: {
              name: "Сгибание на бицепс обратным хватом",
              isIndividual: true,
              reps: 5,
              sets: 4
            }
          },
          {
            name: "Разводка гантелей лежа на скамье 30\u00B0",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5
          },
          {
            name: "Разгибания на трицепс в блоке",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 4,
            superset: {
              name: "Сгибание штанги на бицепс",
              isIndividual: true,
              reps: 10,
              sets: 4
            }
          },
          {
            name: "Сгибание кисти",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 4
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 30,
            sets: 3
          }
        ]
      },
      {
        day: "Ср",
        exercises: [
          {
            name: "Приседания с гирей",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 4
          },
          {
            name: "Разгибание бедра в тренажере",
            isBase: false,
            isIndividual: true,
            reps: 15,
            sets: 3
          },
          {
            name: "Махи гантелей в сторону",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          },
          {
            name: "Вертикальная тяга блока к груди",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 5,
            superset: {
              name: "Горизонтальная тяга блока к поясу",
              isIndividual: true,
              reps: 8,
              sets: 5
            }
          },
          {
            name: "Гиперэкстензия",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 4
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 10,
            sets: 5
          }
        ]
      },
      {
        day: "Пт",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [{ percent: 70, reps: 4, sets: 4 }]
          },
          {
            name: "Пресс",
            isBase: false,
            isIndividual: true,
            reps: 8,
            sets: 2
          },
          {
            name: "Медитация в зале",
            isBase: false,
            isSpecial: true,
            totalReps: 0,
            note: "Тренировка духа. Тренировка воли."
          }
        ]
      }
    ]
  },

  // ==================== НЕДЕЛЯ 9 ====================
  {
    week: 9,
    title: "Клуб 100 кг",
    days: [
      {
        day: "Пн",
        exercises: [
          {
            name: "Жим штанги лежа",
            isBase: true,
            segments: [
              { percent: 60, reps: 5, sets: 1 },
              { percent: 70, reps: 3, sets: 1 },
              { percent: 80, reps: 2, sets: 1 },
              { percent: 90, reps: 1, sets: 1 },
              { percent: 100, reps: 1, sets: 1 }
            ],
            note: "ФИНАЛЬНЫЙ ВЫХОД НА МАКСИМУМ!"
          }
        ]
      }
    ]
  }
];

// ============================================================
// ВЕРСИИ ПРОГРАММЫ
// ============================================================
// Старые проходки продолжают использовать PROGRAM без изменений.
// Новые проходки создаются на версии со специализацией на бицепсе
// и визуальной ширине плеч.
const PROGRAM_VERSION_LEGACY = 1;
const PROGRAM_VERSION_BICEPS = 2;
const PROGRAM_VERSION_POWERLIFTING = 3;
const PROGRAM_REVISION_POWERLIFTING_FULL = 2;
const ACTIVE_PROGRAM_VERSION = PROGRAM_VERSION_POWERLIFTING;

function buildBicepsProgram(baseProgram) {
  const program = JSON.parse(JSON.stringify(baseProgram));
  const weeklyPlan = {
    1: { firstSets: 3, firstReps: 10, secondSets: 3, secondReps: 12 },
    2: { firstSets: 3, firstReps: 10, secondSets: 3, secondReps: 12 },
    3: { firstSets: 4, firstReps: 8, secondSets: 4, secondReps: 12 },
    4: { firstSets: 4, firstReps: 8, secondSets: 4, secondReps: 12 },
    5: { firstSets: 4, firstReps: 8, secondSets: 4, secondReps: 12 },
    6: { firstSets: 4, firstReps: 8, secondSets: 4, secondReps: 12 },
    7: { firstSets: 3, firstReps: 8, secondSets: 3, secondReps: 10 }
  };

  Object.entries(weeklyPlan).forEach(([weekNumber, plan]) => {
    const week = program.find(item => item.week === Number(weekNumber));
    if (!week) return;

    const firstDay = week.days.find(day => day.day === "Пн");
    const firstCurl = firstDay && firstDay.exercises.find(ex =>
      /бицепс/i.test(ex.name) && !/обратным хватом/i.test(ex.name)
    );
    if (firstCurl) {
      Object.assign(firstCurl, {
        name: "Сгибание штанги на бицепс",
        sets: plan.firstSets,
        reps: plan.firstReps,
        note: "Полная амплитуда, корпус неподвижен, оставить 1-2 повтора в запасе"
      });
    }

    const thirdDay = week.days.find(day => day.day === "Пт");
    const reverseIndex = thirdDay
      ? thirdDay.exercises.findIndex(ex => /бицепс.*обратным хватом/i.test(ex.name))
      : -1;
    if (reverseIndex >= 0) {
      thirdDay.exercises[reverseIndex] = {
        name: "Сгибание гантелей на бицепс на наклонной скамье",
        isBase: false,
        isIndividual: true,
        reps: plan.secondReps,
        sets: plan.secondSets,
        note: "Плечи отведены назад, локти неподвижны, оставить 1-2 повтора в запасе"
      };
      thirdDay.exercises.splice(reverseIndex + 1, 0, {
        name: "Сгибание обратным хватом (поддержка предплечий)",
        isBase: false,
        isIndividual: true,
        reps: 12,
        sets: 2,
        note: "Легко и без отказа"
      });
    }
  });

  // На восьмой неделе убираем оба бицепсовых суперсета и оставляем
  // только короткую лёгкую работу в начале недели перед проходкой.
  const taperWeek = program.find(item => item.week === 8);
  const taperDay = taperWeek && taperWeek.days.find(day => day.day === "Пн");
  if (taperDay) {
    taperDay.exercises.forEach(ex => {
      if (ex.superset && /бицепс/i.test(ex.superset.name)) delete ex.superset;
    });
    const pressIndex = taperDay.exercises.findIndex(ex => ex.name === "Пресс");
    const insertIndex = pressIndex >= 0 ? pressIndex : taperDay.exercises.length;
    taperDay.exercises.splice(insertIndex, 0, {
      name: "Сгибание штанги на бицепс (лёгко)",
      isBase: false,
      isIndividual: true,
      reps: 10,
      sets: 2,
      note: "Оставить 3-4 повтора в запасе, без отказа"
    });
  }

  // Средняя дельта: заменяем разрозненные махи гантелями на системную
  // работу одной рукой в кроссовере дважды в неделю. На восьмой неделе
  // оставляем только лёгкую поддержку, на неделе проходки — ничего.
  const lateralRaisePlan = {
    1: { sets: 3, reps: 15, days: ["Пн", "Пт"] },
    2: { sets: 3, reps: 15, days: ["Пн", "Пт"] },
    3: { sets: 4, reps: 15, days: ["Пн", "Пт"] },
    4: { sets: 4, reps: 15, days: ["Пн", "Пт"] },
    5: { sets: 4, reps: 15, days: ["Пн", "Пт"] },
    6: { sets: 4, reps: 15, days: ["Пн", "Пт"] },
    7: { sets: 3, reps: 15, days: ["Пн", "Пт"] },
    8: { sets: 2, reps: 15, days: ["Пн"], light: true }
  };

  Object.entries(lateralRaisePlan).forEach(([weekNumber, plan]) => {
    const week = program.find(item => item.week === Number(weekNumber));
    if (!week) return;

    week.days.forEach(day => {
      day.exercises = day.exercises.filter(ex =>
        !/махи гантелей в сторону/i.test(ex.name)
      );
    });

    plan.days.forEach(dayName => {
      const day = week.days.find(item => item.day === dayName);
      if (!day) return;

      const armExerciseIndex = day.exercises.findIndex(ex => /бицепс/i.test(ex.name));
      const insertIndex = armExerciseIndex >= 0 ? armExerciseIndex : day.exercises.length;
      day.exercises.splice(insertIndex, 0, {
        name: "Махи одной рукой в кроссовере в сторону",
        isBase: false,
        isIndividual: true,
        reps: plan.reps,
        sets: plan.sets,
        note: plan.light
          ? "На каждую руку. Легко, без раскачки, оставить 3-4 повтора в запасе"
          : "На каждую руку. Вести локтем, не поднимать плечо к уху, оставить 1-2 повтора в запасе"
      });
    });
  });

  return program;
}

const PROGRAM_BICEPS = buildBicepsProgram(PROGRAM);

// Жимовая проходка с техническим приседом и становой. Вся жимовая и верхняя
// подсобка версии 2 сохраняется без изменений; заменяются только прежние
// упражнения на ноги. Compact-режим воспроизводит предыдущую редакцию и
// нужен исключительно для безопасной миграции уже записанных тренировок.
function buildPowerliftingProgram(baseProgram, compact = false) {
  const program = JSON.parse(JSON.stringify(baseProgram));
  const titles = {
    1: "Жим 100 + техника",
    2: "Закрепляем движения",
    3: "Наращиваем объём",
    4: "Рабочая база",
    5: "Силовой блок",
    6: "Сила и техника",
    7: "Подводка",
    8: "Снижение нагрузки",
    9: "Проходка жима"
  };
  const lowerPlan = {
    1: { squat: [3, 5, "RPE 5-6"], deadlift: [3, 3, "RPE 5-6"] },
    2: { squat: [3, 5, "RPE 6"], deadlift: [3, 3, "RPE 6"] },
    3: { squat: [4, 5, "RPE 6"], deadlift: [4, 3, "RPE 6"] },
    4: { squat: [4, 4, "RPE 6-7"], deadlift: [4, 3, "RPE 6-7"] },
    5: { squat: [4, 4, "RPE 7"], deadlift: [4, 3, "RPE 7"] },
    6: { squat: [4, 3, "RPE 7"], deadlift: [4, 2, "RPE 7"] },
    7: { squat: [3, 3, "RPE 6-7"], deadlift: [3, 2, "RPE 6-7"] },
    8: { squat: [2, 3, "RPE 5-6"], deadlift: [2, 2, "RPE 5-6"] }
  };

  const oldLegAccessory = /разгибание бедра|приседания (с гирей|без веса)/i;
  const compactLowerBody = /разгибание бедра|приседания (с гирей|без веса)|гиперэкстензия/i;
  const removableAccessory = /разводка гантелей|сгибание кисти|^пресс$|прощание с залом|медитация в зале/i;

  const makeSquat = plan => ({
    name: "Присед со штангой (соревновательная техника)",
    isBase: true,
    isIndividual: true,
    sets: plan[0],
    reps: plan[1],
    note: `${plan[2]}. Складка таза ниже верха колена, одинаковая техника во всех повторах. Добавлять 2,5-5 кг только без боли и потери глубины`
  });

  const makeDeadlift = plan => ({
    name: "Становая тяга классическая",
    isBase: true,
    isIndividual: true,
    sets: plan[0],
    reps: plan[1],
    note: `${plan[2]}. Каждый повтор с полной остановки, спина и стартовая позиция одинаковые. Оставить 3-5 повторов в запасе`
  });

  const setExerciseSets = (day, namePattern, sets) => {
    if (!day) return;
    const exercise = day.exercises.find(ex => namePattern.test(ex.name));
    if (!exercise) return;
    if (exercise.segments && exercise.segments.length === 1) {
      exercise.segments[0].sets = sets;
    } else if (!exercise.segments) {
      exercise.sets = sets;
    }
  };

  program.forEach(week => {
    week.title = titles[week.week] || week.title;
    if (week.week === 9) return;

    week.days.forEach(day => {
      const lowerPattern = compact ? compactLowerBody : oldLegAccessory;
      day.exercises = day.exercises.filter(ex =>
        !lowerPattern.test(ex.name) && (!compact || !removableAccessory.test(ex.name))
      );
    });

    const firstDay = week.days.find(day => day.day === "Пн");
    const middleDay = week.days.find(day => day.day === "Ср");
    const thirdDay = week.days.find(day => day.day === "Пт");
    const plan = lowerPlan[week.week];
    if (!plan) return;

    if (compact) {
      if (week.week === 7 && firstDay) {
        firstDay.exercises = firstDay.exercises.filter(ex =>
          !/жим гантелей лежа на скамье 30|разгибания на трицепс/i.test(ex.name)
        );
      }
      if ([4, 6].includes(week.week) && firstDay) {
        firstDay.exercises = firstDay.exercises.filter(ex =>
          !/^жим гантелей лежа$/i.test(ex.name)
        );
      }
      if (week.week === 5 && firstDay) {
        firstDay.exercises = firstDay.exercises.filter(ex =>
          !/отжимания узким хватом/i.test(ex.name)
        );
      }
      if (middleDay && week.week === 3) {
        middleDay.exercises = middleDay.exercises.filter(ex =>
          !/жим гантелей сидя/i.test(ex.name)
        );
      }
      if (middleDay && week.week === 5) {
        middleDay.exercises = middleDay.exercises.filter(ex =>
          !/жим штанги стоя/i.test(ex.name)
        );
      }
      if (thirdDay) {
        thirdDay.exercises = thirdDay.exercises.filter(ex =>
          !/жим штанги сидя/i.test(ex.name)
        );
      }

      if (week.week === 1) {
        setExerciseSets(firstDay, /жим штанги узким хватом/i, 3);
        setExerciseSets(middleDay, /отжимания на брусьях/i, 3);
        setExerciseSets(middleDay, /вертикальная тяга блока/i, 3);
      }
      if (week.week === 2) {
        setExerciseSets(middleDay, /разгибания на трицепс/i, 3);
        setExerciseSets(middleDay, /горизонтальная тяга блока/i, 4);
        setExerciseSets(thirdDay, /жим штанги лежа широким хватом/i, 3);
      }
      if (week.week === 3) {
        setExerciseSets(firstDay, /жим штанги лежа средним хватом/i, 3);
        setExerciseSets(thirdDay, /отжимания на брусьях/i, 3);
      }
      if (week.week === 5) {
        setExerciseSets(middleDay, /жим гантелей на скамье 30/i, 4);
        setExerciseSets(middleDay, /вертикальная тяга блока/i, 4);
        setExerciseSets(thirdDay, /жим штанги узким хватом/i, 3);
      }
      if (week.week === 6) {
        setExerciseSets(middleDay, /жим гантелей сидя/i, 3);
        setExerciseSets(middleDay, /вертикальная тяга блока/i, 4);
      }
      if (week.week === 7) {
        setExerciseSets(middleDay, /вертикальная тяга блока/i, 3);
        setExerciseSets(thirdDay, /жим штанги узким хватом/i, 3);
      }
      if (week.week === 8) {
        setExerciseSets(firstDay, /разгибания на трицепс/i, 3);
        setExerciseSets(middleDay, /вертикальная тяга блока/i, 3);
      }
    }

    if (firstDay) firstDay.exercises.splice(1, 0, makeSquat(plan.squat));
    if (middleDay) middleDay.exercises.unshift(makeDeadlift(plan.deadlift));
  });

  // До достижения 100 кг не проверяем максимум приседа и тяги. Последняя
  // неделя полностью принадлежит проходке основного жима.
  const testWeek = program.find(item => item.week === 9);
  if (testWeek) {
    const benchTest = testWeek.days.find(day => day.day === "Пн");
    testWeek.days = [benchTest].filter(Boolean);
  }

  return program;
}

const PROGRAM_POWERLIFTING_COMPACT = buildPowerliftingProgram(PROGRAM_BICEPS, true);
const PROGRAM_POWERLIFTING = buildPowerliftingProgram(PROGRAM_BICEPS);

function getProgramByVersion(version) {
  const numericVersion = Number(version);
  if (numericVersion === PROGRAM_VERSION_POWERLIFTING) return PROGRAM_POWERLIFTING;
  if (numericVersion >= PROGRAM_VERSION_BICEPS) return PROGRAM_BICEPS;
  return PROGRAM;
}

function getProgramLabelByVersion(version) {
  const numericVersion = Number(version);
  if (numericVersion === PROGRAM_VERSION_POWERLIFTING) return "Жим 100 + база";
  if (numericVersion >= PROGRAM_VERSION_BICEPS) return "Бицепс + плечи v2";
  return "Классическая";
}
