import type { TranslationTree } from "../types";

export const ru: TranslationTree = {
	common: {
		appName: "Baseboard",
		automatic: "Автоматически",
		cancel: "Отмена",
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
		baseboardWaitingForBasesData: "Baseboard ожидает данные Bases.",
		couldNotAddPropertyLink: "Не удалось добавить ссылку свойства: {message}",
		couldNotFind: "Не удалось найти {path}.",
		couldNotRemovePropertyLink: "Не удалось удалить ссылку свойства: {message}",
		couldNotUpdateLink: "Не удалось обновить ссылку: {message}",
		languageChanged: "Язык изменён на {language}.",
		linkActionUnavailable: "Это действие со ссылкой недоступно для этих заметок.",
		noLinkedCanvas: "{source} ещё не имеет связанного канваса.",
		noVisibleLinkProperties: "Нет видимых свойств заметки, доступных для ссылок.",
		obsidianVersionRequired: "Для Baseboard требуется Obsidian 1.10.1 или новее.",
		openBaseboardViewFirst: "Сначала откройте представление baseboard.",
		openBasesViewFirst: "Сначала откройте представление bases.",
		removedDependency: "Зависимость удалена.",
		removedProjectRelationship: "Связь проекта удалена.",
		removedPropertyLink: "Ссылка {property} удалена.",
		chooseCanvasPath: "Выберите путь к канвасу.",
		chooseLinkProperty: "Выберите свойство заметки для этой ссылки.",
		starterFilesBlocked: "Не удалось создать начальные файлы, потому что один из начальных путей уже используется другим файлом или папкой.",
		starterFilesReady: "Начальные файлы готовы в Baseboard/.",
		updatedCanvas: "Обновлено {path}: узлов — {nodes}, связей — {edges}."
	},
	settings: {
		defaults: {
			heading: "По умолчанию",
			canvasFolder: {
				name: "Папка канваса по умолчанию",
				description: "Папка, используемая когда у представления baseboard ещё нет пути к канвасу."
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
				description: "По умолчанию показывать редактируемый текст заметки на живых карточках baseboard."
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "Интеграция с TaskNotes",
				description: "Поведение TaskNotes по умолчанию для новых представлений baseboard."
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
				description: "Сохранять существующие позиции узлов baseboard при обновлении канваса."
			},
			removeMissingNotes: {
				name: "Удалять отсутствующие заметки",
				description: "Удалять узлы baseboard, которых больше нет в текущем результате base."
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
			description: "Изменить язык команд, настроек, уведомлений и представлений Baseboard.",
			name: "Язык интерфейса",
			dropdownDescription: "Выберите язык, используемый для текста интерфейса Baseboard."
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
			tracked: "Отслеживается"
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
			description: "Сохранять позиции для узлов baseboard, уже присутствующих на канвасе."
		},
		createCanvas: "Создать канвас"
	},
	view: {
		waitingForBasesData: "Ожидание данных Bases",
		toolbar: {
			pinNote: "Закрепить заметку",
			addCard: "Добавить карточку",
			addGroup: "Добавить группу",
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
			editCard: "Редактировать карточку",
			writeNote: "Написать заметку",
			linkFromNote: "Связать из этой заметки"
		},
		group: {
			createTitle: "Создать группу",
			defaultName: "Группа",
			create: "Создать",
			renameTitle: "Переименовать группу",
			rename: "Переименовать"
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
			renameGroup: "Переименовать группу",
			removeGroup: "Удалить группу",
			createGroupFromSelection: "Создать группу из выделенного",
			sourceBlocksTarget: "{source} блокирует {target}",
			targetBlocksSource: "{target} блокирует {source}",
			targetSubtaskOfSource: "{target} — подзадача {source}",
			sourceSubtaskOfTarget: "{source} — подзадача {target}",
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
			saved: "Сохранено"
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
