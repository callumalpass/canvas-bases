import type { TranslationTree } from "../types";

export const ja: TranslationTree = {
	common: {
		appName: "Canvas Bases",
		automatic: "自動",
		cancel: "キャンセル",
		close: "閉じる",
		card: {
			one: "{count} 枚のカード",
			other: "{count} 枚のカード"
		},
		group: {
			one: "{count} 個のグループ",
			other: "{count} 個のグループ"
		},
		languages: {
			en: "英語"
		},
		none: "なし",
		note: {
			one: "{count} 件のノート",
			other: "{count} 件のノート"
		},
		off: "オフ",
		systemDefault: "システム既定"
	},
	commands: {
		createCanvasFromCurrentView: "現在の Bases ビューからキャンバスを作成",
		createStarterFiles: "スターターファイルを作成",
		openLinkedCanvas: "リンクされたキャンバスを開く",
		updateLinkedCanvas: "リンクされたキャンバスを更新"
	},
	notices: {
		addedDependency: "依存関係を追加しました: {label}。",
		addedProjectRelationship: "プロジェクトの関係を追加しました: {label}。",
		addedPropertyLink: "{property} を追加しました: {source} -> {target}。",
		activeGroupDisabled: "ゾーンを削除しました: {label}。",
		activeGroupEnabled: "ゾーンを有効にしました: {label}。",
		activeGroupReadOnly: "このゾーンは書き込み可能なノートプロパティを更新できません。",
		activeGroupTaskUpdateUnavailable: "TaskNotes は Canvas Bases からそのタスクプロパティを更新できません。",
		activeGroupUpdated: "{property} を {value} に更新しました。",
		activeGroupActionRun: "ゾーンアクションを実行しました: {action}。",
		activeGroupActionNotTask: "このゾーンアクションは TaskNotes タスクでのみ使えます。",
		activeGroupActionUnavailable: "この TaskNotes ゾーンアクションは利用できません。",
		canvasBasesWaitingForBasesData: "Canvas Bases は Bases のデータを待機しています。",
		couldNotAddPropertyLink: "プロパティリンクを追加できませんでした: {message}",
		couldNotFind: "{path} が見つかりませんでした。",
		couldNotRemovePropertyLink: "プロパティリンクを削除できませんでした: {message}",
		couldNotUpdateActiveGroup: "ゾーンの値を更新できませんでした: {message}",
		couldNotUpdateLink: "リンクを更新できませんでした: {message}",
		languageChanged: "言語を {language} に変更しました。",
		linkActionUnavailable: "これらのノートではそのリンク操作は利用できません。",
		noLinkedCanvas: "{source} にはまだリンクされたキャンバスがありません。",
		noVisibleLinkProperties: "リンクに利用できる表示中のノートプロパティはありません。",
		obsidianVersionRequired: "Canvas Bases には Obsidian 1.10.2 以上が必要です。",
		openCanvasBasesViewFirst: "先に Canvas Bases ビューを開いてください。",
		openBasesViewFirst: "先に Bases ビューを開いてください。",
		resolveInlineEditorConflict: "リンクを変更する前にインラインエディターの競合を解決してください。",
		removedDependency: "依存関係を削除しました。",
		removedProjectRelationship: "プロジェクトの関係を削除しました。",
		removedPropertyLink: "{property} リンクを削除しました。",
		chooseCanvasPath: "キャンバスのパスを選択してください。",
		chooseLinkProperty: "このリンクに使用するノートのプロパティを選択してください。",
		starterFilesBlocked: "スターター用のパスが別のファイルまたはフォルダで既に使われているため、スターターファイルを作成できませんでした。",
		starterFilesReady: "スターターファイルを Canvas Bases/ に用意しました。",
		updatedCanvas: "{path} を更新しました: {nodes} ノード、{edges} エッジ。"
	},
	settings: {
		defaults: {
			heading: "既定値",
			canvasFolder: {
				name: "既定のキャンバスフォルダ",
				description: "Canvas Bases ビューにキャンバスのパスがまだ設定されていない場合に使用するフォルダ。"
			},
			layout: {
				name: "既定のレイアウト",
				description: "新しいキャンバススナップショットで使用される初期レイアウト。"
			},
			edges: {
				name: "既定のエッジ",
				description: "新しいキャンバススナップショットの初期エッジソース。"
			},
			edgeProperties: {
				name: "既定のエッジプロパティ",
				description: "プロパティエッジを有効にしたときに使用するフロントマタープロパティ（カンマ区切り）。"
			},
			bodyEditor: {
				name: "本文エディタを表示",
				description: "ライブ Canvas Bases カードに編集可能なノート本文を既定で表示します。"
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "TaskNotes 連携",
				description: "新しい Canvas Bases ビューの既定の TaskNotes 動作。"
			},
			badges: {
				name: "タスクバッジを表示",
				description: "ライブカードに TaskNotes のステータス、優先度、期限、ブロッカーを既定で表示します。"
			},
			actions: {
				name: "タスク操作を表示",
				description: "カード操作から TaskNotes のタスクメニューを既定で使用します。"
			},
			relationships: {
				name: "タスクの関係エッジ",
				description: "生成されたキャンバスとライブボードの既定の TaskNotes 関係エッジ。"
			}
		},
		updateRules: {
			heading: "更新ルール",
			preservePositions: {
				name: "位置を保持",
				description: "キャンバスを更新する際に、既存の Canvas Bases ノードの位置を保持します。"
			},
			removeMissingNotes: {
				name: "見つからないノートを削除",
				description: "現在の Base の結果に表示されなくなった Canvas Bases ノードを削除します。"
			},
			nodeWidth: {
				name: "ノードの幅",
				description: "キャンバスのファイルノードの既定の幅。"
			},
			nodeHeight: {
				name: "ノードの高さ",
				description: "キャンバスのファイルノードの既定の高さ。"
			}
		},
		language: {
			heading: "インターフェース言語",
			description: "Canvas Bases のコマンド、設定、通知、ビューの言語を変更します。",
			name: "UI 言語",
			dropdownDescription: "Canvas Bases のインターフェーステキストに使用する言語を選択します。"
		}
	},
	options: {
		layout: {
			columns: "グループ化された列",
			rows: "グループ化された行",
			grid: "グリッド"
		},
		edgeMode: {
			wikilinks: "ビュー内のリンク",
			properties: "選択されたプロパティ",
			all: "リンクと選択されたプロパティ"
		},
		relationships: {
			dependencies: "依存関係",
			all: "依存関係とサブタスク"
		}
	},
	tasknotes: {
		badges: {
			due: "期限",
			scheduled: "予定",
			recurrence: "繰り返し",
			recurring: "繰り返し",
			blocked: "ブロックされている",
			blocking: "ブロック中",
			subtasks: "サブタスク",
			estimate: "見積もり",
			tracked: "追跡中",
			tracking: "時間記録中",
			active: "アクティブ"
		},
		relationships: {
			blocks: "ブロックする",
			subtask: "サブタスク"
		}
	},
	modal: {
		title: "ビューからキャンバスを作成",
		canvasPath: {
			name: "キャンバスのパス",
			description: "生成された JSON キャンバスファイルの Vault 内パス。"
		},
		layout: {
			name: "レイアウト",
			description: "生成されたキャンバスでの Base グループの配置方法。"
		},
		nodeSize: {
			name: "ノードのサイズ",
			description: "新しいキャンバスのファイルノードの幅と高さ。",
			width: "幅",
			height: "高さ"
		},
		edges: {
			name: "エッジ",
			description: "両方のノートがこの Base の結果に含まれる場合にのみエッジを描画します。"
		},
		linkProperties: {
			name: "リンクプロパティ",
			description: "プロパティエッジに使用するフロントマタープロパティ（カンマ区切り）。",
			placeholder: "依存先, 関連"
		},
		taskRelationships: {
			name: "タスクの関係エッジ",
			description: "生成されたキャンバスにタスクの関係エッジを追加します。"
		},
		preservePositions: {
			description: "キャンバスに既に存在する Canvas Bases ノードの位置を保持します。"
		},
		createCanvas: "キャンバスを作成"
	},
	view: {
		waitingForBasesData: "Bases のデータを待機中",
		toolbar: {
			pinNote: "ノートをピン留め",
			addCard: "カードを追加",
			addGroup: "グループを追加",
			addZone: "ゾーンを追加",
			createCanvas: "キャンバスを作成",
			updateCanvas: "キャンバスを更新",
			openCanvas: "キャンバスを開く",
			resetLayout: "レイアウトをリセット"
		},
		empty: {
			title: "このビューにはノートがありません",
			body: "Base のフィルターを変更するか、ノートをピン留めするか、カードを追加してください。"
		},
		card: {
			pinned: "ピン留め済み",
			noteActions: "ノート操作",
			textCardTitle: "カード",
			cardActions: "カード操作",
			groupActions: "グループ操作",
			color: "色",
			noteColor: "ノートの色",
			cardColor: "カードの色",
			editCard: "カードを編集",
			writeNote: "ノートを書く",
			linkFromNote: "このノートからリンク"
		},
		linkDrag: {
			releaseToLink: "{target} にリンクするには離します",
			dragToCard: "別のノートカードにドロップ",
			cannotLinkHere: "ここにはリンクできません"
		},
		group: {
			active: "ゾーン",
			activeTitle: "割り当てゾーン",
			zoneTitle: "割り当てゾーン",
			label: "ラベル",
			action: "ドロップ時のアクション",
			actionSetProperty: "プロパティを更新",
			actionCompleteTask: "タスクを完了",
			actionUncompleteTask: "タスクを未完了にする",
			actionArchiveTask: "タスクをアーカイブ",
			actionUnarchiveTask: "タスクのアーカイブを解除",
			actionStartTimeTracking: "時間記録を開始",
			actionStopTimeTracking: "時間記録を停止",
			actionStartPomodoro: "ポモドーロを開始",
			actionAssignPomodoro: "現在のポモドーロに割り当て",
			actionCompleteRecurring: "繰り返し予定を完了",
			actionSkipRecurring: "繰り返し予定をスキップ",
			property: "プロパティ",
			value: "値",
			updateMode: "更新モード",
			valueType: "値の種類",
			updateModeReplace: "置換",
			updateModeAppend: "追加",
			updateModeAppendUnique: "重複なしで追加",
			updateModeRemove: "削除",
			updateModeClear: "クリア",
			valueTypeAuto: "自動",
			valueTypeString: "テキスト",
			valueTypeNumber: "数値",
			valueTypeBoolean: "真偽値",
			valueTypeDate: "日付",
			valueTypeList: "リスト",
			color: "色",
			writeRule: "書き込みルール",
			groupRuleLocked: "このゾーンは現在の Base グループに従います。別のプロパティを書き込むにはカスタムゾーンを使用してください。",
			dropResult: "ドロップ結果",
			previewWrite: "{mode}: {property} -> {value}.",
			previewClear: "{mode}: {property}.",
			previewAction: "{action}.",
			emptyValue: "空の値",
			propertyRequired: "保存する前にプロパティを選択してください。",
			createTitle: "グループを作成",
			defaultName: "グループ",
			defaultZoneName: "ゾーン",
			create: "作成",
			createZone: "ゾーンを作成",
			renameTitle: "グループ名を変更",
			rename: "名前を変更",
			saveActiveGroup: "ゾーンを保存"
		},
		tooltips: {
			dragGroup: "グループをドラッグ",
			resizeGroup: "グループのサイズを変更",
			dragNote: "ノートをドラッグ。ダブルクリックで開きます。",
			resizeCard: "カードのサイズを変更",
			dragToLinkNotes: "ドラッグしてノートをリンク",
			dragCard: "カードをドラッグ",
			zoomOut: "ズームアウト",
			zoomIn: "ズームイン",
			fitView: "ビューに合わせる",
			resetView: "ビューをリセット"
		},
		menu: {
			openNote: "ノートを開く",
			unpinFromBoard: "ボードからピン留めを解除",
			removeCard: "カードを削除",
			setCardColor: "色を設定",
			clearCardColor: "色をクリア",
			createNote: "新しいノートを作成",
			addPinnedNote: "ピン留めノートを追加",
			addCard: "カードを追加",
			activateGroup: "割り当てゾーンとして使う",
			configureActiveGroup: "ゾーンを設定",
			deactivateActiveGroup: "ゾーンを削除",
			renameGroup: "グループ名を変更",
			removeGroup: "グループを削除",
			fitGroupToCards: "グループをカードに合わせる",
			createGroupFromSelection: "選択範囲からグループを作成",
			createZoneFromSelection: "選択範囲からゾーンを作成",
			sourceBlocksTarget: "{source} は {target} をブロックします",
			targetBlocksSource: "{target} は {source} をブロックします",
			targetSubtaskOfSource: "{target} は {source} のサブタスクです",
			sourceSubtaskOfTarget: "{source} は {target} のサブタスクです",
			dependencyLinks: "依存関係",
			subtaskLinks: "サブタスク",
			propertyLinks: "プロパティリンク",
			addPropertyLink: "{property} を追加: {source} -> {target}",
			chooseProperty: "プロパティを選択...",
			openPath: "{name} を開く",
			removeDependency: "依存関係を削除",
			removeProjectRelationship: "プロジェクトの関係を削除",
			removePropertyLink: "{property} リンクを削除"
		},
		editor: {
			editPath: "{path} を編集",
			loading: "読み込み中",
			unsaved: "未保存",
			missingFile: "ファイルが見つかりません",
			missing: "見つかりません",
			unableToLoad: "読み込めません",
			error: "エラー",
			saving: "保存中",
			saved: "保存済み",
			fileChanged: "ディスク上でファイルが変更されました。保存すると上書きし、Esc で再読み込みします。"
		},
		suggest: {
			propertyPlaceholder: "リンクに使用するノートのプロパティを選択",
			noMatchingProperties: "一致するプロパティはありません",
			notePlaceholder: "このボードにノートをピン留め",
			noMatchingNotes: "一致するノートはありません"
		}
	},
	basesOptions: {
		canvas: "キャンバス",
		canvasPath: "キャンバスのパス",
		layout: "レイアウト",
		edges: "エッジ",
		linkProperties: "リンクプロパティ",
		cards: "カード",
		showBodyEditor: "本文エディタを表示",
		tasknotes: "TaskNotes",
		tasknotesIntegration: "TaskNotes 連携",
		showTaskBadges: "タスクバッジを表示",
		showTaskActions: "タスク操作を表示",
		taskRelationshipEdges: "タスクの関係エッジ",
		manualCards: "手動カード",
		pinnedNotes: "ピン留めされたノート",
		updateRules: "更新ルール",
		preservePositions: "位置を保持",
		removeMissingNotes: "見つからないノートを削除",
		nodeWidth: "ノードの幅",
		nodeHeight: "ノードの高さ"
	}
};
