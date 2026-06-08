import type { TranslationTree } from "../types";

export const zh: TranslationTree = {
	common: {
		appName: "Baseboard",
		automatic: "自动",
		cancel: "取消",
		card: {
			one: "{count} 张卡片",
			other: "{count} 张卡片"
		},
		group: {
			one: "{count} 个分组",
			other: "{count} 个分组"
		},
		languages: {
			en: "英语"
		},
		none: "无",
		note: {
			one: "{count} 个笔记",
			other: "{count} 个笔记"
		},
		off: "关闭",
		systemDefault: "系统默认"
	},
	commands: {
		createCanvasFromCurrentView: "从当前 bases 视图创建画布",
		createStarterFiles: "创建入门文件",
		openLinkedCanvas: "打开关联画布",
		updateLinkedCanvas: "更新关联画布"
	},
	notices: {
		addedDependency: "已添加依赖项：{label}。",
		addedProjectRelationship: "已添加项目关系：{label}。",
		addedPropertyLink: "已添加 {property}：{source} -> {target}。",
		baseboardWaitingForBasesData: "Baseboard 正在等待 bases 数据。",
		couldNotAddPropertyLink: "无法添加属性链接：{message}",
		couldNotFind: "找不到 {path}。",
		couldNotRemovePropertyLink: "无法移除属性链接：{message}",
		couldNotUpdateLink: "无法更新链接：{message}",
		languageChanged: "语言已更改为 {language}。",
		linkActionUnavailable: "该链接操作对这些笔记不可用。",
		noLinkedCanvas: "{source} 尚未关联画布。",
		noVisibleLinkProperties: "没有可见的笔记属性可用于链接。",
		obsidianVersionRequired: "Baseboard 需要 Obsidian 1.10.1 或更新版本。",
		openBaseboardViewFirst: "请先打开 baseboard 视图。",
		openBasesViewFirst: "请先打开 bases 视图。",
		removedDependency: "已移除依赖项。",
		removedProjectRelationship: "已移除项目关系。",
		removedPropertyLink: "已移除 {property} 链接。",
		chooseCanvasPath: "选择画布路径。",
		chooseLinkProperty: "为此链接选择笔记属性。",
		starterFilesBlocked: "无法创建入门文件，因为某个入门路径已被其他文件或文件夹使用。",
		starterFilesReady: "入门文件已在 Baseboard/ 中准备好。",
		updatedCanvas: "已更新 {path}：{nodes} 个节点，{edges} 条连线。"
	},
	settings: {
		defaults: {
			heading: "默认值",
			canvasFolder: {
				name: "默认画布文件夹",
				description: "当 baseboard 视图尚未指定画布路径时使用的文件夹。"
			},
			layout: {
				name: "默认布局",
				description: "新画布快照使用的初始布局。"
			},
			edges: {
				name: "默认连线",
				description: "新画布快照的初始连线来源。"
			},
			edgeProperties: {
				name: "默认连线属性",
				description: "启用属性连线时使用的 frontmatter 属性，以逗号分隔。"
			},
			bodyEditor: {
				name: "显示正文编辑器",
				description: "默认在实时 baseboard 卡片上显示可编辑的笔记正文。"
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "TaskNotes 集成",
				description: "新建 baseboard 视图的默认 TaskNotes 行为。"
			},
			badges: {
				name: "显示任务徽章",
				description: "默认在实时卡片上显示 TaskNotes 的状态、优先级、截止日期和阻塞项。"
			},
			actions: {
				name: "显示任务操作",
				description: "默认从卡片操作中使用 TaskNotes 任务菜单。"
			},
			relationships: {
				name: "任务关系连线",
				description: "生成的画布和实时面板的默认 TaskNotes 关系连线。"
			}
		},
		updateRules: {
			heading: "更新规则",
			preservePositions: {
				name: "保留位置",
				description: "更新画布时保留现有 baseboard 节点的位置。"
			},
			removeMissingNotes: {
				name: "移除缺失的笔记",
				description: "移除不再出现在当前 base 结果中的 baseboard 节点。"
			},
			nodeWidth: {
				name: "节点宽度",
				description: "画布文件节点的默认宽度。"
			},
			nodeHeight: {
				name: "节点高度",
				description: "画布文件节点的默认高度。"
			}
		},
		language: {
			heading: "界面语言",
			description: "更改 Baseboard 命令、设置、通知和视图的语言。",
			name: "界面语言",
			dropdownDescription: "选择 Baseboard 界面文本使用的语言。"
		}
	},
	options: {
		layout: {
			columns: "分组列",
			rows: "分组行",
			grid: "网格"
		},
		edgeMode: {
			wikilinks: "视图内链接",
			properties: "选定属性",
			all: "链接和选定属性"
		},
		relationships: {
			dependencies: "依赖项",
			all: "依赖项和子任务"
		}
	},
	tasknotes: {
		badges: {
			due: "截止",
			scheduled: "已安排",
			recurrence: "重复",
			recurring: "重复",
			blocked: "被阻塞",
			blocking: "阻塞",
			subtasks: "子任务",
			estimate: "预估",
			tracked: "已跟踪"
		},
		relationships: {
			blocks: "阻塞",
			subtask: "子任务"
		}
	},
	modal: {
		title: "从视图创建画布",
		canvasPath: {
			name: "画布路径",
			description: "生成的 JSON 画布文件的库路径。"
		},
		layout: {
			name: "布局",
			description: "base 分组在生成的画布中的排列方式。"
		},
		nodeSize: {
			name: "节点大小",
			description: "新画布文件节点的宽度和高度。",
			width: "宽度",
			height: "高度"
		},
		edges: {
			name: "连线",
			description: "仅当两个笔记都在此 base 结果中时才绘制连线。"
		},
		linkProperties: {
			name: "链接属性",
			description: "用于属性连线的 frontmatter 属性，以逗号分隔。",
			placeholder: "依赖于, 相关"
		},
		taskRelationships: {
			name: "任务关系连线",
			description: "在生成的画布中添加任务关系连线。"
		},
		preservePositions: {
			description: "保留画布中已存在的 baseboard 节点的位置。"
		},
		createCanvas: "创建画布"
	},
	view: {
		waitingForBasesData: "等待 Bases 数据",
		toolbar: {
			pinNote: "固定笔记",
			addCard: "添加卡片",
			addGroup: "添加分组",
			createCanvas: "创建画布",
			updateCanvas: "更新画布",
			openCanvas: "打开画布",
			resetLayout: "重置布局"
		},
		empty: {
			title: "此视图中没有笔记",
			body: "更改 Base 筛选器、固定笔记或添加卡片。"
		},
		card: {
			pinned: "已固定",
			noteActions: "笔记操作",
			textCardTitle: "卡片",
			cardActions: "卡片操作",
			groupActions: "分组操作",
			editCard: "编辑卡片",
			writeNote: "撰写笔记",
			linkFromNote: "从此笔记链接"
		},
		group: {
			createTitle: "创建分组",
			defaultName: "分组",
			create: "创建",
			renameTitle: "重命名分组",
			rename: "重命名"
		},
		tooltips: {
			dragGroup: "拖动分组",
			resizeGroup: "调整分组大小",
			dragNote: "拖动笔记。双击打开。",
			resizeCard: "调整卡片大小",
			dragToLinkNotes: "拖动以链接笔记",
			dragCard: "拖动卡片",
			zoomOut: "缩小",
			zoomIn: "放大",
			fitView: "适应视图",
			resetView: "重置视图"
		},
		menu: {
			openNote: "打开笔记",
			unpinFromBoard: "从面板取消固定",
			removeCard: "移除卡片",
			renameGroup: "重命名分组",
			removeGroup: "移除分组",
			sourceBlocksTarget: "{source} 阻塞 {target}",
			targetBlocksSource: "{target} 阻塞 {source}",
			targetSubtaskOfSource: "{target} 是 {source} 的子任务",
			sourceSubtaskOfTarget: "{source} 是 {target} 的子任务",
			addPropertyLink: "添加 {property}：{source} -> {target}",
			chooseProperty: "选择属性...",
			openPath: "打开 {name}",
			removeDependency: "移除依赖项",
			removeProjectRelationship: "移除项目关系",
			removePropertyLink: "移除 {property} 链接"
		},
		editor: {
			editPath: "编辑 {path}",
			loading: "加载中",
			unsaved: "未保存",
			missingFile: "缺失文件",
			missing: "缺失",
			unableToLoad: "无法加载",
			error: "错误",
			saving: "保存中",
			saved: "已保存"
		},
		suggest: {
			propertyPlaceholder: "为链接选择笔记属性",
			noMatchingProperties: "没有匹配的属性",
			notePlaceholder: "将笔记固定到此面板",
			noMatchingNotes: "没有匹配的笔记"
		}
	},
	basesOptions: {
		canvas: "画布",
		canvasPath: "画布路径",
		layout: "布局",
		edges: "连线",
		linkProperties: "链接属性",
		cards: "卡片",
		showBodyEditor: "显示正文编辑器",
		tasknotes: "TaskNotes",
		tasknotesIntegration: "TaskNotes 集成",
		showTaskBadges: "显示任务徽章",
		showTaskActions: "显示任务操作",
		taskRelationshipEdges: "任务关系连线",
		manualCards: "手动卡片",
		pinnedNotes: "已固定的笔记",
		updateRules: "更新规则",
		preservePositions: "保留位置",
		removeMissingNotes: "移除缺失的笔记",
		nodeWidth: "节点宽度",
		nodeHeight: "节点高度"
	}
};
