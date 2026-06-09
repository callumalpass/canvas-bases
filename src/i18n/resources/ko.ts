import type { TranslationTree } from "../types";

export const ko: TranslationTree = {
	common: {
		appName: "Canvas Bases",
		automatic: "자동",
		cancel: "취소",
		close: "닫기",
		card: {
			one: "카드 {count}개",
			other: "카드 {count}개"
		},
		group: {
			one: "그룹 {count}개",
			other: "그룹 {count}개"
		},
		languages: {
			en: "영어"
		},
		none: "없음",
		note: {
			one: "노트 {count}개",
			other: "노트 {count}개"
		},
		off: "끄기",
		systemDefault: "시스템 기본값"
	},
	commands: {
		createCanvasFromCurrentView: "현재 베이스 보기에서 캔버스 만들기",
		createStarterFiles: "시작 파일 만들기",
		openLinkedCanvas: "연결된 캔버스 열기",
		updateLinkedCanvas: "연결된 캔버스 업데이트"
	},
	notices: {
		addedDependency: "종속성 추가됨: {label}.",
		addedProjectRelationship: "프로젝트 관계 추가됨: {label}.",
		addedPropertyLink: "{property} 추가됨: {source} -> {target}.",
		activeGroupDisabled: "구역 제거됨: {label}.",
		activeGroupEnabled: "구역 활성화됨: {label}.",
		activeGroupReadOnly: "이 구역은 쓰기 가능한 노트 속성을 업데이트할 수 없습니다.",
		activeGroupTaskUpdateUnavailable: "TaskNotes가 Canvas Bases에서 해당 작업 속성을 업데이트할 수 없습니다.",
		activeGroupUpdated: "{property}이(가) {value}(으)로 업데이트되었습니다.",
		activeGroupActionRun: "구역 작업 실행됨: {action}.",
		activeGroupActionNotTask: "이 구역 작업은 TaskNotes 작업에만 사용할 수 있습니다.",
		activeGroupActionUnavailable: "이 TaskNotes 구역 작업은 사용할 수 없습니다.",
		canvasBasesWaitingForBasesData: "Canvas Bases가 베이스 데이터를 기다리고 있습니다.",
		couldNotAddPropertyLink: "속성 링크를 추가할 수 없습니다: {message}",
		couldNotFind: "{path}을(를) 찾을 수 없습니다.",
		couldNotRemovePropertyLink: "속성 링크를 제거할 수 없습니다: {message}",
		couldNotUpdateActiveGroup: "구역 값을 업데이트할 수 없습니다: {message}",
		couldNotUpdateLink: "링크를 업데이트할 수 없습니다: {message}",
		languageChanged: "언어가 {language}(으)로 변경되었습니다.",
		linkActionUnavailable: "해당 링크 작업은 이 노트에서 사용할 수 없습니다.",
		noLinkedCanvas: "{source}에는 아직 연결된 캔버스가 없습니다.",
		noVisibleLinkProperties: "링크에 사용할 수 있는 표시된 노트 속성이 없습니다.",
		obsidianVersionRequired: "Canvas Bases는 Obsidian 1.10.1 이상이 필요합니다.",
		openCanvasBasesViewFirst: "먼저 Canvas Bases 보기를 여세요.",
		openBasesViewFirst: "먼저 베이스 보기를 여세요.",
		resolveInlineEditorConflict: "링크를 변경하기 전에 인라인 편집기 충돌을 해결하세요.",
		removedDependency: "종속성이 제거되었습니다.",
		removedProjectRelationship: "프로젝트 관계가 제거되었습니다.",
		removedPropertyLink: "{property} 링크가 제거되었습니다.",
		chooseCanvasPath: "캔버스 경로를 선택하세요.",
		chooseLinkProperty: "이 링크에 사용할 노트 속성을 선택하세요.",
		starterFilesBlocked: "시작 경로가 이미 다른 파일이나 폴더에서 사용 중이라 시작 파일을 만들 수 없습니다.",
		starterFilesReady: "시작 파일이 Canvas Bases/에 준비되었습니다.",
		updatedCanvas: "{path} 업데이트됨: 노드 {nodes}개, 엣지 {edges}개."
	},
	settings: {
		defaults: {
			heading: "기본값",
			canvasFolder: {
				name: "기본 캔버스 폴더",
				description: "Canvas Bases 보기에 아직 캔버스 경로가 없을 때 사용되는 폴더입니다."
			},
			layout: {
				name: "기본 레이아웃",
				description: "새 캔버스 스냅샷에 사용되는 초기 레이아웃입니다."
			},
			edges: {
				name: "기본 엣지",
				description: "새 캔버스 스냅샷의 초기 엣지 소스입니다."
			},
			edgeProperties: {
				name: "기본 엣지 속성",
				description: "속성 엣지가 활성화될 때 사용되는 쉼표로 구분된 프론트매터 속성입니다."
			},
			bodyEditor: {
				name: "본문 편집기 표시",
				description: "라이브 Canvas Bases 카드에 편집 가능한 노트 본문 텍스트를 기본으로 표시합니다."
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "TaskNotes 통합",
				description: "새 Canvas Bases 보기의 기본 TaskNotes 동작입니다."
			},
			badges: {
				name: "작업 배지 표시",
				description: "라이브 카드에 TaskNotes 상태, 우선순위, 기한 및 차단 요소를 기본으로 표시합니다."
			},
			actions: {
				name: "작업 동작 표시",
				description: "카드 작업에서 기본적으로 TaskNotes 작업 메뉴를 사용합니다."
			},
			relationships: {
				name: "작업 관계 엣지",
				description: "생성된 캔버스 및 라이브 보드의 기본 TaskNotes 관계 엣지입니다."
			}
		},
		updateRules: {
			heading: "업데이트 규칙",
			preservePositions: {
				name: "위치 유지",
				description: "캔버스를 업데이트할 때 기존 Canvas Bases 노드 위치를 유지합니다."
			},
			removeMissingNotes: {
				name: "누락된 노트 제거",
				description: "현재 베이스 결과에 더 이상 나타나지 않는 Canvas Bases 노드를 제거합니다."
			},
			nodeWidth: {
				name: "노드 너비",
				description: "기본 캔버스 파일 노드 너비입니다."
			},
			nodeHeight: {
				name: "노드 높이",
				description: "기본 캔버스 파일 노드 높이입니다."
			}
		},
		language: {
			heading: "인터페이스 언어",
			description: "Canvas Bases 명령, 설정, 알림 및 보기의 언어를 변경합니다.",
			name: "UI 언어",
			dropdownDescription: "Canvas Bases 인터페이스 텍스트에 사용할 언어를 선택하세요."
		}
	},
	options: {
		layout: {
			columns: "그룹화된 열",
			rows: "그룹화된 행",
			grid: "그리드"
		},
		edgeMode: {
			wikilinks: "보기 내 링크",
			properties: "선택된 속성",
			all: "링크 및 선택된 속성"
		},
		relationships: {
			dependencies: "종속성",
			all: "종속성 및 하위 작업"
		}
	},
	tasknotes: {
		badges: {
			due: "기한",
			scheduled: "예약됨",
			recurrence: "반복",
			recurring: "반복",
			blocked: "차단됨",
			blocking: "차단 중",
			subtasks: "하위 작업",
			estimate: "예상",
			tracked: "추적됨",
			tracking: "시간 기록 중",
			active: "활성"
		},
		relationships: {
			blocks: "차단",
			subtask: "하위 작업"
		}
	},
	modal: {
		title: "보기에서 캔버스 만들기",
		canvasPath: {
			name: "캔버스 경로",
			description: "생성된 JSON 캔버스 파일의 보관소 경로입니다."
		},
		layout: {
			name: "레이아웃",
			description: "생성된 캔버스에서 베이스 그룹이 배치되는 방식입니다."
		},
		nodeSize: {
			name: "노드 크기",
			description: "새 캔버스 파일 노드의 너비와 높이입니다.",
			width: "너비",
			height: "높이"
		},
		edges: {
			name: "엣지",
			description: "두 노트가 모두 이 베이스 결과에 있을 때만 엣지를 그립니다."
		},
		linkProperties: {
			name: "링크 속성",
			description: "속성 엣지에 사용되는 쉼표로 구분된 프론트매터 속성입니다.",
			placeholder: "의존, 관련"
		},
		taskRelationships: {
			name: "작업 관계 엣지",
			description: "생성된 캔버스에 작업 관계 엣지를 추가합니다."
		},
		preservePositions: {
			description: "이미 캔버스에 있는 Canvas Bases 노드의 위치를 유지합니다."
		},
		createCanvas: "캔버스 만들기"
	},
	view: {
		waitingForBasesData: "베이스 데이터 대기 중",
		toolbar: {
			pinNote: "노트 고정",
			addCard: "카드 추가",
			addGroup: "그룹 추가",
			addZone: "구역 추가",
			createCanvas: "캔버스 만들기",
			updateCanvas: "캔버스 업데이트",
			openCanvas: "캔버스 열기",
			resetLayout: "레이아웃 재설정"
		},
		empty: {
			title: "이 보기에 노트가 없습니다",
			body: "Base 필터를 변경하거나, 노트를 고정하거나, 카드를 추가하세요."
		},
		card: {
			pinned: "고정됨",
			noteActions: "노트 작업",
			textCardTitle: "카드",
			cardActions: "카드 작업",
			groupActions: "그룹 작업",
			color: "색상",
			noteColor: "노트 색상",
			cardColor: "카드 색상",
			editCard: "카드 편집",
			writeNote: "노트 작성",
			linkFromNote: "이 노트에서 링크"
		},
		linkDrag: {
			releaseToLink: "{target}에 연결하려면 놓으세요",
			dragToCard: "다른 노트 카드 위에 놓기",
			cannotLinkHere: "여기에는 연결할 수 없습니다"
		},
		group: {
			active: "구역",
			activeTitle: "할당 구역",
			zoneTitle: "할당 구역",
			label: "레이블",
			action: "드롭 동작",
			actionSetProperty: "속성 업데이트",
			actionCompleteTask: "작업 완료",
			actionUncompleteTask: "작업을 미완료로 표시",
			actionArchiveTask: "작업 보관",
			actionUnarchiveTask: "작업 보관 해제",
			actionStartTimeTracking: "시간 추적 시작",
			actionStopTimeTracking: "시간 추적 중지",
			actionStartPomodoro: "Pomodoro 시작",
			actionAssignPomodoro: "현재 Pomodoro에 할당",
			actionCompleteRecurring: "반복 항목 완료",
			actionSkipRecurring: "반복 항목 건너뛰기",
			property: "속성",
			value: "값",
			updateMode: "업데이트 모드",
			valueType: "값 유형",
			updateModeReplace: "바꾸기",
			updateModeAppend: "추가",
			updateModeAppendUnique: "고유하게 추가",
			updateModeRemove: "제거",
			updateModeClear: "지우기",
			valueTypeAuto: "자동",
			valueTypeString: "텍스트",
			valueTypeNumber: "숫자",
			valueTypeBoolean: "불리언",
			valueTypeDate: "날짜",
			valueTypeList: "목록",
			color: "색상",
			writeRule: "쓰기 규칙",
			groupRuleLocked: "이 구역은 현재 Base 그룹을 따릅니다. 다른 속성에 쓰려면 사용자 지정 구역을 사용하세요.",
			dropResult: "드롭 결과",
			previewWrite: "{mode}: {property} -> {value}.",
			previewClear: "{mode}: {property}.",
			previewAction: "{action}.",
			emptyValue: "빈 값",
			propertyRequired: "저장하기 전에 속성을 선택하세요.",
			createTitle: "그룹 만들기",
			defaultName: "그룹",
			defaultZoneName: "구역",
			create: "만들기",
			createZone: "구역 만들기",
			renameTitle: "그룹 이름 바꾸기",
			rename: "이름 바꾸기",
			saveActiveGroup: "구역 저장"
		},
		tooltips: {
			dragGroup: "그룹 드래그",
			resizeGroup: "그룹 크기 조정",
			dragNote: "노트를 드래그하세요. 더블 클릭하여 엽니다.",
			resizeCard: "카드 크기 조정",
			dragToLinkNotes: "드래그하여 노트 연결",
			dragCard: "카드 드래그",
			zoomOut: "축소",
			zoomIn: "확대",
			fitView: "보기에 맞추기",
			resetView: "보기 재설정"
		},
		menu: {
			openNote: "노트 열기",
			unpinFromBoard: "보드에서 고정 해제",
			removeCard: "카드 제거",
			setCardColor: "색상 설정",
			clearCardColor: "색상 지우기",
			addPinnedNote: "고정 노트 추가",
			addCard: "카드 추가",
			activateGroup: "할당 구역으로 사용",
			configureActiveGroup: "구역 구성",
			deactivateActiveGroup: "구역 제거",
			renameGroup: "그룹 이름 바꾸기",
			removeGroup: "그룹 제거",
			fitGroupToCards: "그룹을 카드에 맞추기",
			createGroupFromSelection: "선택 항목에서 그룹 만들기",
			createZoneFromSelection: "선택 항목에서 구역 만들기",
			sourceBlocksTarget: "{source}이(가) {target}을(를) 차단",
			targetBlocksSource: "{target}이(가) {source}을(를) 차단",
			targetSubtaskOfSource: "{target}은(는) {source}의 하위 작업입니다",
			sourceSubtaskOfTarget: "{source}은(는) {target}의 하위 작업입니다",
			dependencyLinks: "의존성",
			subtaskLinks: "하위 작업",
			propertyLinks: "속성 링크",
			addPropertyLink: "{property} 추가: {source} -> {target}",
			chooseProperty: "속성 선택...",
			openPath: "{name} 열기",
			removeDependency: "종속성 제거",
			removeProjectRelationship: "프로젝트 관계 제거",
			removePropertyLink: "{property} 링크 제거"
		},
		editor: {
			editPath: "{path} 편집",
			loading: "불러오는 중",
			unsaved: "저장되지 않음",
			missingFile: "누락된 파일",
			missing: "누락됨",
			unableToLoad: "불러올 수 없음",
			error: "오류",
			saving: "저장 중",
			saved: "저장됨",
			fileChanged: "파일이 디스크에서 변경되었습니다. 저장하면 덮어쓰고 Esc는 다시 불러옵니다."
		},
		suggest: {
			propertyPlaceholder: "링크에 사용할 노트 속성을 선택하세요",
			noMatchingProperties: "일치하는 속성 없음",
			notePlaceholder: "이 보드에 노트 고정",
			noMatchingNotes: "일치하는 노트 없음"
		}
	},
	basesOptions: {
		canvas: "캔버스",
		canvasPath: "캔버스 경로",
		layout: "레이아웃",
		edges: "엣지",
		linkProperties: "링크 속성",
		cards: "카드",
		showBodyEditor: "본문 편집기 표시",
		tasknotes: "TaskNotes",
		tasknotesIntegration: "TaskNotes 통합",
		showTaskBadges: "작업 배지 표시",
		showTaskActions: "작업 동작 표시",
		taskRelationshipEdges: "작업 관계 엣지",
		manualCards: "수동 카드",
		pinnedNotes: "고정된 노트",
		updateRules: "업데이트 규칙",
		preservePositions: "위치 유지",
		removeMissingNotes: "누락된 노트 제거",
		nodeWidth: "노드 너비",
		nodeHeight: "노드 높이"
	}
};
