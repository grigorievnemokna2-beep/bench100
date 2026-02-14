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
            name: "Жим штанги на скамье 30\u00B0",
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
            name: "Жим штанги лежа с бруска",
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
