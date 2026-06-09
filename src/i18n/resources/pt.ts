import type { TranslationTree } from "../types";

export const pt: TranslationTree = {
	common: {
		appName: "Canvas Bases",
		automatic: "Automático",
		cancel: "Cancelar",
		close: "Fechar",
		card: {
			one: "{count} cartão",
			other: "{count} cartões"
		},
		group: {
			one: "{count} grupo",
			other: "{count} grupos"
		},
		languages: {
			en: "Inglês"
		},
		none: "Nenhum",
		note: {
			one: "{count} nota",
			other: "{count} notas"
		},
		off: "Desligado",
		systemDefault: "Padrão do sistema"
	},
	commands: {
		createCanvasFromCurrentView: "Criar canvas a partir da visualização atual do Bases",
		createStarterFiles: "Criar arquivos iniciais",
		openLinkedCanvas: "Abrir canvas vinculado",
		updateLinkedCanvas: "Atualizar canvas vinculado"
	},
	notices: {
		addedDependency: "Dependência adicionada: {label}.",
		addedProjectRelationship: "Relacionamento de projeto adicionado: {label}.",
		addedPropertyLink: "{property} adicionado: {source} -> {target}.",
		activeGroupDisabled: "Zona removida: {label}.",
		activeGroupEnabled: "Zona ativada: {label}.",
		activeGroupReadOnly: "Esta zona não pode atualizar uma propriedade de nota gravável.",
		activeGroupTaskUpdateUnavailable: "O TaskNotes não pode atualizar essa propriedade de tarefa a partir do Canvas Bases.",
		activeGroupUpdated: "{property} atualizado para {value}.",
		activeGroupActionRun: "Ação da zona executada: {action}.",
		activeGroupActionNotTask: "Essa ação de zona só funciona com tarefas do TaskNotes.",
		activeGroupActionUnavailable: "Essa ação de zona do TaskNotes não está disponível.",
		canvasBasesWaitingForBasesData: "O Canvas Bases está aguardando dados do Bases.",
		couldNotAddPropertyLink: "Não foi possível adicionar o link de propriedade: {message}",
		couldNotFind: "Não foi possível encontrar {path}.",
		couldNotRemovePropertyLink: "Não foi possível remover o link de propriedade: {message}",
		couldNotUpdateActiveGroup: "Não foi possível atualizar o valor da zona: {message}",
		couldNotUpdateLink: "Não foi possível atualizar o link: {message}",
		languageChanged: "Idioma alterado para {language}.",
		linkActionUnavailable: "Essa ação de link não está disponível para estas notas.",
		noLinkedCanvas: "{source} ainda não tem um canvas vinculado.",
		noVisibleLinkProperties: "Nenhuma propriedade de nota visível está disponível para links.",
		obsidianVersionRequired: "O Canvas Bases requer o Obsidian 1.10.1 ou mais recente.",
		openCanvasBasesViewFirst: "Abra uma visualização do Canvas Bases primeiro.",
		openBasesViewFirst: "Abra uma visualização do Bases primeiro.",
		resolveInlineEditorConflict: "Resolva o conflito do editor embutido antes de alterar links.",
		removedDependency: "Dependência removida.",
		removedProjectRelationship: "Relacionamento de projeto removido.",
		removedPropertyLink: "Link de {property} removido.",
		chooseCanvasPath: "Escolha um caminho de canvas.",
		chooseLinkProperty: "Escolha uma propriedade da nota para este link.",
		starterFilesBlocked: "Não foi possível criar os arquivos iniciais porque um caminho inicial já está sendo usado por outro arquivo ou pasta.",
		starterFilesReady: "Os arquivos iniciais estão prontos em Canvas Bases/.",
		updatedCanvas: "{path} atualizado: {nodes} nós, {edges} arestas."
	},
	settings: {
		defaults: {
			heading: "Padrões",
			canvasFolder: {
				name: "Pasta padrão do canvas",
				description: "Pasta usada quando uma visualização do Canvas Bases ainda não tem caminho de canvas."
			},
			layout: {
				name: "Layout padrão",
				description: "Layout inicial usado para novos snapshots de canvas."
			},
			edges: {
				name: "Arestas padrão",
				description: "Fonte de aresta inicial para novos snapshots de canvas."
			},
			edgeProperties: {
				name: "Propriedades de aresta padrão",
				description: "Propriedades de frontmatter separadas por vírgula usadas quando as arestas de propriedade estão ativadas."
			},
			bodyEditor: {
				name: "Mostrar editor de corpo",
				description: "Mostrar o texto editável do corpo da nota em cartões ao vivo do Canvas Bases por padrão."
			}
		},
		tasknotes: {
			heading: "TaskNotes",
			integration: {
				name: "Integração com TaskNotes",
				description: "Comportamento padrão do TaskNotes para novas visualizações do Canvas Bases."
			},
			badges: {
				name: "Mostrar emblemas da tarefa",
				description: "Mostrar status, prioridade, datas de vencimento e bloqueadores do TaskNotes em cartões ao vivo por padrão."
			},
			actions: {
				name: "Mostrar ações da tarefa",
				description: "Usar o menu de tarefas do TaskNotes a partir das ações do cartão por padrão."
			},
			relationships: {
				name: "Arestas de relacionamento de tarefas",
				description: "Arestas de relacionamento padrão do TaskNotes para canvases gerados e quadros ao vivo."
			}
		},
		updateRules: {
			heading: "Regras de atualização",
			preservePositions: {
				name: "Preservar posições",
				description: "Manter as posições existentes dos nós do Canvas Bases ao atualizar um canvas."
			},
			removeMissingNotes: {
				name: "Remover notas ausentes",
				description: "Remover nós do Canvas Bases que não aparecem mais no resultado atual do Base."
			},
			nodeWidth: {
				name: "Largura do nó",
				description: "Largura padrão do nó de arquivo do canvas."
			},
			nodeHeight: {
				name: "Altura do nó",
				description: "Altura padrão do nó de arquivo do canvas."
			}
		},
		language: {
			heading: "Idioma da interface",
			description: "Alterar o idioma dos comandos, configurações, avisos e visualizações do Canvas Bases.",
			name: "Idioma da interface",
			dropdownDescription: "Selecione o idioma usado para o texto da interface do Canvas Bases."
		}
	},
	options: {
		layout: {
			columns: "Colunas agrupadas",
			rows: "Linhas agrupadas",
			grid: "Grade"
		},
		edgeMode: {
			wikilinks: "Links dentro da visualização",
			properties: "Propriedades selecionadas",
			all: "Links e propriedades selecionadas"
		},
		relationships: {
			dependencies: "Dependências",
			all: "Dependências e subtarefas"
		}
	},
	tasknotes: {
		badges: {
			due: "Vencimento",
			scheduled: "Agendado",
			recurrence: "Repete",
			recurring: "Recorrente",
			blocked: "Bloqueado",
			blocking: "Bloqueando",
			subtasks: "Subtarefas",
			estimate: "Estimativa",
			tracked: "Rastreado",
			tracking: "Em controle",
			active: "Ativo"
		},
		relationships: {
			blocks: "bloqueia",
			subtask: "subtarefa"
		}
	},
	modal: {
		title: "Criar canvas a partir da visualização",
		canvasPath: {
			name: "Caminho do canvas",
			description: "Caminho do cofre para o arquivo JSON do canvas gerado."
		},
		layout: {
			name: "Disposição",
			description: "Como os grupos do Base são organizados no canvas gerado."
		},
		nodeSize: {
			name: "Tamanho do nó",
			description: "Largura e altura para novos nós de arquivo do canvas.",
			width: "Largura",
			height: "Altura"
		},
		edges: {
			name: "Arestas",
			description: "Desenhar arestas apenas quando ambas as notas estão neste resultado do Base."
		},
		linkProperties: {
			name: "Propriedades do link",
			description: "Propriedades de frontmatter separadas por vírgula usadas para arestas de propriedade.",
			placeholder: "depende_de, relacionado"
		},
		taskRelationships: {
			name: "Arestas de relacionamento de tarefas",
			description: "Adicionar arestas de relacionamento de tarefas ao canvas gerado."
		},
		preservePositions: {
			description: "Manter as posições dos nós do Canvas Bases já presentes no canvas."
		},
		createCanvas: "Criar canvas"
	},
	view: {
		waitingForBasesData: "Aguardando dados do Bases",
		toolbar: {
			pinNote: "Fixar nota",
			addCard: "Adicionar cartão",
			addGroup: "Adicionar grupo",
			addZone: "Adicionar zona",
			createCanvas: "Criar canvas",
			updateCanvas: "Atualizar canvas",
			openCanvas: "Abrir canvas",
			resetLayout: "Redefinir layout"
		},
		empty: {
			title: "Nenhuma nota nesta visualização",
			body: "Altere os filtros do Base, fixe uma nota ou adicione um cartão."
		},
		card: {
			pinned: "Fixado",
			noteActions: "Ações da nota",
			textCardTitle: "Cartão",
			cardActions: "Ações do cartão",
			groupActions: "Ações do grupo",
			color: "Cor",
			noteColor: "Cor da nota",
			cardColor: "Cor do cartão",
			editCard: "Editar cartão",
			writeNote: "Escrever uma nota",
			linkFromNote: "Vincular a partir desta nota"
		},
		linkDrag: {
			releaseToLink: "Solte para vincular a {target}",
			dragToCard: "Solte em outro cartão de nota",
			cannotLinkHere: "Não é possível vincular aqui"
		},
		group: {
			active: "Zona",
			activeTitle: "Zona de atribuição",
			zoneTitle: "Zona de atribuição",
			label: "Rótulo",
			action: "Ação ao soltar",
			actionSetProperty: "Atualizar propriedade",
			actionCompleteTask: "Concluir tarefa",
			actionUncompleteTask: "Marcar tarefa como incompleta",
			actionArchiveTask: "Arquivar tarefa",
			actionUnarchiveTask: "Desarquivar tarefa",
			actionStartTimeTracking: "Iniciar controle de tempo",
			actionStopTimeTracking: "Parar controle de tempo",
			actionStartPomodoro: "Iniciar Pomodoro",
			actionAssignPomodoro: "Atribuir ao Pomodoro atual",
			actionCompleteRecurring: "Concluir ocorrência recorrente",
			actionSkipRecurring: "Pular ocorrência recorrente",
			property: "Propriedade",
			value: "Valor",
			updateMode: "Modo de atualização",
			valueType: "Tipo de valor",
			updateModeReplace: "Substituir",
			updateModeAppend: "Anexar",
			updateModeAppendUnique: "Anexar único",
			updateModeRemove: "Remover",
			updateModeClear: "Limpar",
			valueTypeAuto: "Automático",
			valueTypeString: "Texto",
			valueTypeNumber: "Número",
			valueTypeBoolean: "Booleano",
			valueTypeDate: "Data",
			valueTypeList: "Lista",
			color: "Cor",
			writeRule: "Regra de gravação",
			groupRuleLocked: "Esta zona segue o grupo atual da Base. Use uma zona personalizada para gravar outra propriedade.",
			dropResult: "Resultado ao soltar",
			previewWrite: "{mode}: {property} -> {value}.",
			previewClear: "{mode}: {property}.",
			previewAction: "{action}.",
			emptyValue: "valor vazio",
			propertyRequired: "Escolha uma propriedade antes de salvar.",
			createTitle: "Criar grupo",
			defaultName: "Grupo",
			defaultZoneName: "Zona",
			create: "Criar",
			createZone: "Criar zona",
			renameTitle: "Renomear grupo",
			rename: "Renomear",
			saveActiveGroup: "Salvar zona"
		},
		tooltips: {
			dragGroup: "Arrastar grupo",
			resizeGroup: "Redimensionar grupo",
			dragNote: "Arrastar nota. Clique duplo para abrir.",
			resizeCard: "Redimensionar cartão",
			dragToLinkNotes: "Arraste para vincular notas",
			dragCard: "Arrastar cartão",
			zoomOut: "Diminuir zoom",
			zoomIn: "Aumentar zoom",
			fitView: "Ajustar visualização",
			resetView: "Redefinir visualização"
		},
		menu: {
			openNote: "Abrir nota",
			unpinFromBoard: "Desafixar do quadro",
			removeCard: "Remover cartão",
			setCardColor: "Definir cor",
			clearCardColor: "Limpar cor",
			addPinnedNote: "Adicionar nota fixada",
			addCard: "Adicionar cartão",
			activateGroup: "Usar como zona de atribuição",
			configureActiveGroup: "Configurar zona",
			deactivateActiveGroup: "Remover zona",
			renameGroup: "Renomear grupo",
			removeGroup: "Remover grupo",
			fitGroupToCards: "Ajustar grupo aos cartões",
			createGroupFromSelection: "Criar grupo a partir da seleção",
			createZoneFromSelection: "Criar zona a partir da seleção",
			sourceBlocksTarget: "{source} bloqueia {target}",
			targetBlocksSource: "{target} bloqueia {source}",
			targetSubtaskOfSource: "{target} é subtarefa de {source}",
			sourceSubtaskOfTarget: "{source} é subtarefa de {target}",
			dependencyLinks: "Dependências",
			subtaskLinks: "Subtarefas",
			propertyLinks: "Links de propriedade",
			addPropertyLink: "Adicionar {property}: {source} -> {target}",
			chooseProperty: "Escolher propriedade...",
			openPath: "Abrir {name}",
			removeDependency: "Remover dependência",
			removeProjectRelationship: "Remover relacionamento de projeto",
			removePropertyLink: "Remover link de {property}"
		},
		editor: {
			editPath: "Editar {path}",
			loading: "Carregando",
			unsaved: "Não salvo",
			missingFile: "Arquivo ausente",
			missing: "Ausente",
			unableToLoad: "Não foi possível carregar",
			error: "Erro",
			saving: "Salvando",
			saved: "Salvo",
			fileChanged: "O arquivo mudou no disco. Salvar substitui; Esc recarrega."
		},
		suggest: {
			propertyPlaceholder: "Escolha uma propriedade da nota para o link",
			noMatchingProperties: "Nenhuma propriedade correspondente",
			notePlaceholder: "Fixar uma nota neste quadro",
			noMatchingNotes: "Nenhuma nota correspondente"
		}
	},
	basesOptions: {
		canvas: "Tela",
		canvasPath: "Caminho do canvas",
		layout: "Disposição",
		edges: "Arestas",
		linkProperties: "Propriedades do link",
		cards: "Cartões",
		showBodyEditor: "Mostrar editor de corpo",
		tasknotes: "TaskNotes",
		tasknotesIntegration: "Integração com TaskNotes",
		showTaskBadges: "Mostrar emblemas da tarefa",
		showTaskActions: "Mostrar ações da tarefa",
		taskRelationshipEdges: "Arestas de relacionamento de tarefas",
		manualCards: "Cartões manuais",
		pinnedNotes: "Notas fixadas",
		updateRules: "Regras de atualização",
		preservePositions: "Preservar posições",
		removeMissingNotes: "Remover notas ausentes",
		nodeWidth: "Largura do nó",
		nodeHeight: "Altura do nó"
	}
};
