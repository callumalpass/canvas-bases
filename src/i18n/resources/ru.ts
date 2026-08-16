import type { TranslationTree } from "../types";

export const ru: TranslationTree = {
	common: {
		appName: "Canvas Bases",
		automatic: "Автоматически",
		cancel: "Отмена",
		close: "Закрыть",
		card: {
			one: "{count} карточка",
			other: "{count} карточек"
		},
		group: {
			one: "{count} группа",
			other: "{count} групп"
		},
		languages: {
			en: "Английский"
		},
		none: "Нет",
		note: {
			one: "{count} заметка",
			other: "{count} заметок"
		},
		off: "Выкл.",
		systemDefault: "Системный по умолчанию"
	},
	commands: {
		createCanvasFromCurrentView: "Создать канвас из текущего представления Bases",
		createStarterFiles: "Создать начальные файлы",
		openLinkedCanvas: "Открыть связанный канвас",
		updateLinkedCanvas: "Обновить связанный канвас"
	},
	notices: {
		addedDependency: "Добавлена зависимость: {label}.",
		addedProjectRelationship: "Добавлена связь проекта: {label}.",
		addedPropertyLink: "Добавлено {property}: {source} -> {target}.",
		activeGroupDisabled: "Зона удалена: {label}.",
		activeGroupEnabled: "Зона включена: {label}.",
		activeGroupReadOnly: "Эта зона не может обновлять доступное для записи свойство заметки.",
		activeGroupTaskUpdateUnavailable: "TaskNotes не может обновить это свойство задачи из Canvas Bases.",
		activeGroupUpdated: "{property} обновлено до {value}.",
		activeGroupActionRun: "Выполнено действие зоны: {action}.",
		activeGroupActionNotTask: "Это действие зоны работает только с задачами TaskNotes.",
		activeGroupActionUnavailable: "Это действие зоны TaskNotes недоступно.",
		canvasBasesWaitingForBasesData: "Canvas Bases ожидает данные Bases.",
		couldNotAddPropertyLink: "Не удалось добавить ссылку свойства: {message}",
		couldNotFind: "Не удалось найти {path}.",
		couldNotRemovePropertyLink: "Не удалось удалить ссылку свойства: {message}",
		couldNotUpdateActiveGroup: "Не удалось обновить значение зоны: {message}",
		couldNotUpdateLink: "Не удалось обновить ссылку: {message}",
		languageChanged: "Язык изменён на {language}.",
		linkActionUnavailable: "Это действие со ссылкой недоступно для этих заметок.",
		noLinkedCanvas: "{source} ещё не имеет связанного канваса.",
		noVisibleLinkProperties: "Нет видимых свойств заметки, доступных для ссылок.",
		obsidianVersionRequired: "Для Canvas Bases требуется Obsidian 1.10.2 или новее.",
		openCanvasBasesViewFirst: "Сначала откройте представление Canvas Bases.",
		openBasesViewFirst: "Сначала откройте представление bases.",
		resolveInlineEditorConflict: "Разрешите конфликт встроенного редактора перед изменением ссылок.",
		removedDependency: "Зависимость удалена.",
		removedProjectRelationship: "Связь проекта удалена.",
		removedPropertyLink: "Ссылка {property} удалена.",
		chooseCanvasPath: "Выберите путь к канвасу.",
		chooseLinkProperty: "Выберите свойство заметки для этой ссылки.",
		starterFilesBlocked: "Не удалось создать начальные файлы, потому что один из начальных путей уже используется другим файлом или папкой.",
		starterFilesReady: "Начальные файлы готовы в Canvas Bases/.",
		updatedCanvas: "Обновлено {path}: узлов — {nodes}, связей — {edges}."
	},
	settings: {
		defaults: {
			heading: "По умолчанию",
			canvasFolder: {
				name: "Папка канваса по умолчанию",
				description: "Папка, используемая когда у представления Canvas Bases ещё нет пути к канвасу."
			},
			layout: {
				name: "Макет по умолчанию",
				description: "Начальный макет для новых снимков канваса."
			},
			edges: {
				name: "Связи по умолчанию",
				description: "Начальный источник связей для новых снимков канваса."
			},
			edgeProperties: {
				name: "Свойства связей по умолчанию",
				description: "Свойства frontmatter через запятую, используемые при включённых связях по свойствам."
			},
			bodyEditor: {
				name: "Показать редактор текста",
				description: "По умолчанию показывать редактируемый текст заметки на живых карточках Canvas Bases."
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "Интеграция с TaskNotes",
				description: "Поведение TaskNotes по умолчанию для новых представлений Canvas Bases."
			},
			badges: {
				name: "Показать значки задачи",
				description: "По умолчанию показывать статус, приоритет, сроки и блокировщики TaskNotes на живых карточках."
			},
			actions: {
				name: "Показать действия задачи",
				description: "По умолчанию использовать меню задач TaskNotes из действий карточки."
			},
			relationships: {
				name: "Связи отношений задач",
				description: "Связи отношений TaskNotes по умолчанию для создаваемых канвасов и живых досок."
			}
		},
		updateRules: {
			heading: "Правила обновления",
			preservePositions: {
				name: "Сохранять позиции",
				description: "Сохранять существующие позиции узлов Canvas Bases при обновлении канваса."
			},
			removeMissingNotes: {
				name: "Удалять отсутствующие заметки",
				description: "Удалять узлы Canvas Bases, которых больше нет в текущем результате base."
			},
			nodeWidth: {
				name: "Ширина узла",
				description: "Ширина узла файла канваса по умолчанию."
			},
			nodeHeight: {
				name: "Высота узла",
				description: "Высота узла файла канваса по умолчанию."
			}
		},
		language: {
			heading: "Язык интерфейса",
			description: "Изменить язык команд, настроек, уведомлений и представлений Canvas Bases.",
			name: "Язык интерфейса",
			dropdownDescription: "Выберите язык, используемый для текста интерфейса Canvas Bases."
		}
	},
	options: {
		layout: {
			columns: "Сгруппированные столбцы",
			rows: "Сгруппированные строки",
			grid: "Сетка"
		},
		edgeMode: {
			wikilinks: "Ссылки в пределах представления",
			properties: "Выбранные свойства",
			all: "Ссылки и выбранные свойства"
		},
		relationships: {
			dependencies: "Зависимости",
			all: "Зависимости и подзадачи"
		}
	},
	tasknotes: {
		badges: {
			due: "Срок",
			scheduled: "Запланировано",
			recurrence: "Повторы",
			recurring: "Повторяющаяся",
			blocked: "Заблокировано",
			blocking: "Блокирует",
			subtasks: "Подзадачи",
			estimate: "Оценка",
			tracked: "Отслеживается",
			tracking: "Учет времени",
			active: "Активно"
		},
		relationships: {
			blocks: "блокирует",
			subtask: "подзадача"
		}
	},
	modal: {
		title: "Создать канвас из представления",
		canvasPath: {
			name: "Путь к канвасу",
			description: "Путь в хранилище для создаваемого файла канваса JSON."
		},
		layout: {
			name: "Макет",
			description: "Как группы base располагаются на создаваемом канвасе."
		},
		nodeSize: {
			name: "Размер узла",
			description: "Ширина и высота для новых узлов файлов канваса.",
			width: "Ширина",
			height: "Высота"
		},
		edges: {
			name: "Связи",
			description: "Рисовать связи только когда обе заметки присутствуют в результате этой Base."
		},
		linkProperties: {
			name: "Свойства ссылок",
			description: "Свойства frontmatter через запятую, используемые для связей по свойствам.",
			placeholder: "depends_on, related"
		},
		taskRelationships: {
			name: "Связи отношений задач",
			description: "Добавлять связи задач на создаваемый канвас."
		},
		preservePositions: {
			description: "Сохранять позиции для узлов Canvas Bases, уже присутствующих на канвасе."
		},
		createCanvas: "Создать канвас"
	},
	view: {
		waitingForBasesData: "Ожидание данных Bases",
		toolbar: {
			pinNote: "Закрепить заметку",
			addCard: "Добавить карточку",
			addGroup: "Добавить группу",
			addZone: "Добавить зону",
			createCanvas: "Создать канвас",
			updateCanvas: "Обновить канвас",
			openCanvas: "Открыть канвас",
			resetLayout: "Сбросить макет"
		},
		empty: {
			title: "Нет заметок в этом представлении",
			body: "Измените фильтры Base, закрепите заметку или добавьте карточку."
		},
		card: {
			pinned: "Закреплено",
			noteActions: "Действия с заметкой",
			textCardTitle: "Карточка",
			cardActions: "Действия с карточкой",
			groupActions: "Действия группы",
			color: "Цвет",
			noteColor: "Цвет заметки",
			cardColor: "Цвет карточки",
			editCard: "Редактировать карточку",
			writeNote: "Написать заметку",
			linkFromNote: "Связать из этой заметки"
		},
		linkDrag: {
			releaseToLink: "Отпустите, чтобы связать с {target}",
			dragToCard: "Отпустите на другой карточке заметки",
			cannotLinkHere: "Здесь нельзя создать связь"
		},
		group: {
			active: "Зона",
			activeTitle: "Зона назначения",
			zoneTitle: "Зона назначения",
			label: "Метка",
			action: "Действие при перетаскивании",
			actionSetProperty: "Обновить свойство",
			actionCompleteTask: "Завершить задачу",
			actionUncompleteTask: "Пометить задачу как незавершенную",
			actionArchiveTask: "Архивировать задачу",
			actionUnarchiveTask: "Разархивировать задачу",
			actionStartTimeTracking: "Начать учёт времени",
			actionStopTimeTracking: "Остановить учёт времени",
			actionStartPomodoro: "Начать Pomodoro",
			actionAssignPomodoro: "Назначить текущему Pomodoro",
			actionCompleteRecurring: "Завершить повторяющийся экземпляр",
			actionSkipRecurring: "Пропустить повторяющийся экземпляр",
			property: "Свойство",
			value: "Значение",
			updateMode: "Режим обновления",
			valueType: "Тип значения",
			updateModeReplace: "Заменить",
			updateModeAppend: "Добавить",
			updateModeAppendUnique: "Добавить без дублей",
			updateModeRemove: "Удалить",
			updateModeClear: "Очистить",
			valueTypeAuto: "Авто",
			valueTypeString: "Текст",
			valueTypeNumber: "Число",
			valueTypeBoolean: "Логическое",
			valueTypeDate: "Дата",
			valueTypeList: "Список",
			color: "Цвет",
			writeRule: "Правило записи",
			groupRuleLocked: "Эта зона следует текущей группе Base. Используйте пользовательскую зону, чтобы записывать другое свойство.",
			dropResult: "Результат перетаскивания",
			previewWrite: "{mode}: {property} -> {value}.",
			previewClear: "{mode}: {property}.",
			previewAction: "{action}.",
			emptyValue: "пустое значение",
			propertyRequired: "Выберите свойство перед сохранением.",
			createTitle: "Создать группу",
			defaultName: "Группа",
			defaultZoneName: "Зона",
			create: "Создать",
			createZone: "Создать зону",
			renameTitle: "Переименовать группу",
			rename: "Переименовать",
			saveActiveGroup: "Сохранить зону"
		},
		tooltips: {
			dragGroup: "Перетащить группу",
			resizeGroup: "Изменить размер группы",
			dragNote: "Перетащить заметку. Двойной клик — открыть.",
			resizeCard: "Изменить размер карточки",
			dragToLinkNotes: "Перетащите, чтобы связать заметки",
			dragCard: "Перетащить карточку",
			zoomOut: "Уменьшить",
			zoomIn: "Увеличить",
			fitView: "Вписать в окно",
			resetView: "Сбросить вид"
		},
		menu: {
			openNote: "Открыть заметку",
			unpinFromBoard: "Открепить от доски",
			removeCard: "Удалить карточку",
			setCardColor: "Задать цвет",
			clearCardColor: "Сбросить цвет",
			createNote: "Создать заметку",
			addPinnedNote: "Добавить закреплённую заметку",
			addCard: "Добавить карточку",
			activateGroup: "Использовать как зону назначения",
			configureActiveGroup: "Настроить зону",
			deactivateActiveGroup: "Удалить зону",
			renameGroup: "Переименовать группу",
			removeGroup: "Удалить группу",
			fitGroupToCards: "Подогнать группу под карточки",
			createGroupFromSelection: "Создать группу из выделенного",
			createZoneFromSelection: "Создать зону из выделенного",
			sourceBlocksTarget: "{source} блокирует {target}",
			targetBlocksSource: "{target} блокирует {source}",
			targetSubtaskOfSource: "{target} — подзадача {source}",
			sourceSubtaskOfTarget: "{source} — подзадача {target}",
			dependencyLinks: "Зависимости",
			subtaskLinks: "Подзадачи",
			propertyLinks: "Ссылки свойств",
			addPropertyLink: "Добавить {property}: {source} -> {target}",
			chooseProperty: "Выбрать свойство...",
			openPath: "Открыть {name}",
			removeDependency: "Удалить зависимость",
			removeProjectRelationship: "Удалить связь проекта",
			removePropertyLink: "Удалить ссылку {property}"
		},
		editor: {
			editPath: "Редактировать {path}",
			loading: "Загрузка",
			unsaved: "Не сохранено",
			missingFile: "Файл отсутствует",
			missing: "Отсутствует",
			unableToLoad: "Не удалось загрузить",
			error: "Ошибка",
			saving: "Сохранение",
			saved: "Сохранено",
			fileChanged: "Файл изменён на диске. Сохранение перезапишет; Esc перезагрузит."
		},
		suggest: {
			propertyPlaceholder: "Выберите свойство заметки для ссылки",
			noMatchingProperties: "Нет подходящих свойств",
			notePlaceholder: "Закрепить заметку на этой доске",
			noMatchingNotes: "Нет подходящих заметок"
		}
	},
	basesOptions: {
		canvas: "Канвас",
		canvasPath: "Путь к канвасу",
		layout: "Макет",
		edges: "Связи",
		linkProperties: "Свойства ссылок",
		cards: "Карточки",
		showBodyEditor: "Показать редактор текста",
		tasknotes: "TaskNotes",
		tasknotesIntegration: "Интеграция с TaskNotes",
		showTaskBadges: "Показать значки задачи",
		showTaskActions: "Показать действия задачи",
		taskRelationshipEdges: "Связи отношений задач",
		manualCards: "Ручные карточки",
		pinnedNotes: "Закреплённые заметки",
		updateRules: "Правила обновления",
		preservePositions: "Сохранять позиции",
		removeMissingNotes: "Удалять отсутствующие заметки",
		nodeWidth: "Ширина узла",
		nodeHeight: "Высота узла"
	}
};
