window.__ModuleLoader__.load({id:'dsh-team-workbench/ui',factory:(require)=>{const module={exports:{}};const exports=module.exports;const tagId='dsh-team-workbench/ui/v5';if(!document.querySelector('style[data-plugin-css="'+tagId+'"]')){const tag=document.createElement('style');tag.dataset.plugin='dsh-team-workbench/ui';tag.dataset.pluginCss=tagId;tag.textContent="/* packages/team/modules/ui/lib/types/client/TaskWork.module.css */\n.TaskWork_details {\n  margin-block: 12px;\n  font-size: 13px;\n  line-height: 1.6;\n  overflow-wrap: anywhere;\n}\n.TaskWork_details summary {\n  cursor: pointer;\n  color: var(--dsw-alias-label-secondary);\n}\n.TaskWork_details h4 {\n  margin-block: 12px 4px;\n  font-size: inherit;\n  font-weight: 600;\n}\n.TaskWork_details p {\n  white-space: pre-wrap;\n  margin-block: 4px;\n}\n.TaskWork_details ul,\n.TaskWork_details ol {\n  padding-inline-start: 20px;\n  margin-block: 4px;\n}\n.TaskWork_versions {\n  display: grid;\n  grid-template-columns: max-content minmax(0, 1fr);\n  gap: 5px 18px;\n  margin-block: 12px;\n}\n.TaskWork_versions dt,\n.TaskWork_hint {\n  color: var(--dsw-alias-label-secondary);\n}\n.TaskWork_versions dd {\n  margin: 0;\n}\n@media (max-width: 480px) {\n  .TaskWork_versions {\n    grid-template-columns: 1fr;\n    gap: 2px;\n  }\n  .TaskWork_versions dd {\n    margin-block-end: 6px;\n  }\n}\n\n/* packages/team/modules/ui/lib/types/client/TeamAction.module.css */\n.TeamAction_root {\n  position: relative;\n}\n.TeamAction_trigger {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  min-height: 28px;\n  padding: 3px 7px;\n  border: 0;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n  cursor: pointer;\n}\n.TeamAction_trigger:hover,\n.TeamAction_trigger:focus-visible {\n  color: var(--dsw-alias-label-primary);\n}\n@container (max-width: 480px) {\n  .TeamAction_triggerLabel {\n    display: none;\n  }\n}\n.TeamAction_count {\n  color: var(--dsw-alias-label-caption);\n  font-size: 12px;\n  font-weight: 400;\n  font-variant-numeric: tabular-nums;\n  line-height: 16px;\n}\n.TeamAction_panel {\n  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);\n  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);\n  display: flex;\n  flex-direction: column;\n  position: fixed;\n  z-index: 100;\n  box-sizing: border-box;\n  width: min(500px, 100vw - 32px);\n  max-height: min(680px, calc(100vh - 32px));\n  padding: 8px 2px 0;\n  overflow: hidden;\n  border: 0;\n  border-radius: 12px;\n  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);\n  box-shadow: var(--dsw-elevation-prominent);\n}\n.TeamAction_panel::before {\n  content: \"\";\n  position: absolute;\n  z-index: -1;\n  inset: 0;\n  border-radius: 12px;\n  background: var(--dsw-specific-menu);\n  backdrop-filter: var(--dsw-menu-backdrop-filter);\n}\n.TeamAction_panelCompact {\n  width: min(320px, 100vw - 32px);\n}\n.TeamAction_panelCompact .TeamAction_roster {\n  grid-template-columns: minmax(0, 1fr);\n}\n.TeamAction_body {\n  --dsh-scrollbar-track-margin: 8px;\n  flex: 1 1 auto;\n  min-height: 0;\n  padding: 0 9px 16px 14px;\n  overflow-y: auto;\n  scrollbar-gutter: stable;\n}\n.TeamAction_taskTitle {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.TeamAction_taskTitle strong {\n  font-size: 13px;\n  font-weight: 500;\n}\n.TeamAction_taskSelect {\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  font-size: 13px;\n  font-weight: 500;\n  text-align: left;\n  cursor: pointer;\n}\n.TeamAction_taskSelect:hover,\n.TeamAction_taskSelect:focus-visible {\n  color: var(--dsw-alias-state-business-primary);\n}\n.TeamAction_panel h3 {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin: 16px 0 8px 4px;\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  font-weight: 500;\n}\n.TeamAction_body section:first-of-type h3 {\n  margin-top: 8px;\n}\n.TeamAction_roster {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n.TeamAction_member {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  min-width: 0;\n  padding: 10px 12px;\n  border: 0;\n  --dsw-elevation-stroke-color: var(--dsw-alias-border-l2);\n  box-shadow: var(--dsw-elevation-stroke);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  text-align: left;\n  cursor: pointer;\n}\n.TeamAction_member:disabled {\n  cursor: default;\n}\n.TeamAction_memberConfiguration {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n  margin-top: 6px;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n  line-height: 1.5;\n}\n.TeamAction_personaTag {\n  padding: 1px 6px;\n  border-radius: 4px;\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent);\n  color: var(--dsw-alias-state-business-primary);\n}\n.TeamAction_memberCurrent {\n  --dsw-elevation-stroke-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);\n  box-shadow: var(--dsw-elevation-stroke), inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);\n}\n.TeamAction_member:not(:disabled):hover,\n.TeamAction_member:not(:disabled):focus-visible {\n  --dsw-elevation-stroke-color: var(--dsw-alias-border-l3);\n  box-shadow: var(--dsw-elevation-panel);\n}\n.TeamAction_memberDot {\n  display: inline-flex;\n  align-items: center;\n  flex: none;\n  height: 1lh;\n}\n.TeamAction_inactiveIcon {\n  color: var(--dsw-alias-label-tertiary);\n}\n.TeamAction_memberText {\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n}\n.TeamAction_memberName {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  min-width: 0;\n}\n.TeamAction_memberNameText,\n.TeamAction_memberText small {\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n.TeamAction_memberModel {\n  display: none;\n}\n.TeamAction_member:hover .TeamAction_memberModel,\n.TeamAction_member:focus-visible .TeamAction_memberModel {\n  display: inline;\n}\n.TeamAction_currentTag {\n  display: inline-block;\n  flex: 0 999 auto;\n  min-width: 0;\n  padding: 0 4px;\n  overflow: hidden;\n  font-size: 10px;\n  line-height: 15px;\n  text-overflow: ellipsis;\n}\n.TeamAction_memberText small,\n.TeamAction_meta {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n}\n.TeamAction_diagnostic,\n.TeamAction_error,\n.TeamAction_warning {\n  color: var(--dsw-alias-state-error-primary);\n}\n.TeamAction_tasks {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n}\n.TeamAction_emptyNotice {\n  margin: 16px 0 0 4px;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n}\n.TeamAction_task {\n  padding: 11px 13px;\n  border: 0.5px solid var(--dsw-alias-border-l2);\n  border-radius: 9px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n.TeamAction_taskState {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  margin-left: auto;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n}\n.TeamAction_task p {\n  margin: 5px 0;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 18px;\n  white-space: pre-wrap;\n}\n.TeamAction_clampedDescription {\n  display: -webkit-box;\n  overflow: hidden;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: 2;\n}\n.TeamAction_expandToggle {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;\n  float: right;\n  margin-left: 10px;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  line-height: 20px;\n  cursor: pointer;\n}\n.TeamAction_expandToggle:hover,\n.TeamAction_expandToggle:focus-visible {\n  color: var(--dsw-alias-label-primary);\n}\n.TeamAction_expandToggle svg {\n  transition: transform 120ms ease;\n}\n.TeamAction_expandToggleOpen {\n  transform: rotate(180deg);\n}\n.TeamAction_meta {\n  line-height: 20px;\n}\n.TeamAction_meta > span {\n  margin-right: 10px;\n}\n.TeamAction_notice,\n.TeamAction_error {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 6px;\n  padding: 9px;\n  font-size: 12px;\n}\n.TeamAction_workspacePanel {\n  width: min(1180px, 100vw - 32px);\n  height: min(800px, calc(100vh - 40px));\n  max-height: calc(100vh - 40px);\n  padding: 0;\n  border-radius: 18px;\n}\n.TeamAction_workspaceHeader {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  padding: 24px 28px 18px;\n  background:\n    linear-gradient(\n      120deg,\n      color-mix(in srgb, var(--dsw-alias-state-business-primary) 9%, transparent),\n      transparent 70%);\n}\n.TeamAction_headerActions {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n}\n.TeamAction_plan {\n  max-width: 900px;\n}\n.TeamAction_plan h4 {\n  margin: 18px 0 6px;\n  color: var(--dsw-alias-label-primary);\n  font-size: 12px;\n}\n.TeamAction_plan p,\n.TeamAction_plan li,\n.TeamAction_plan pre {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 1.7;\n  overflow-wrap: anywhere;\n}\n.TeamAction_plan p {\n  white-space: pre-wrap;\n}\n.TeamAction_plan pre {\n  max-height: 42vh;\n  padding: 12px;\n  overflow: auto;\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-2);\n  white-space: pre-wrap;\n}\n.TeamAction_plan ul {\n  padding-inline-start: 20px;\n}\n.TeamAction_eyebrow {\n  color: var(--dsw-alias-state-business-primary);\n  font-size: 11px;\n  letter-spacing: .08em;\n}\n.TeamAction_workspaceHeader h2 {\n  margin: 6px 0;\n  color: var(--dsw-alias-label-primary);\n  font-size: 23px;\n  font-weight: 600;\n}\n.TeamAction_workspaceHeader p,\n.TeamAction_sectionHint {\n  margin: 0;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 1.7;\n}\n.TeamAction_roles > h3 {\n  margin: 0 0 8px;\n  font-size: 14px;\n  font-weight: 600;\n}\n.TeamAction_workspacePanel .TeamAction_body {\n  padding: 20px 22px 24px 28px;\n}\n.TeamAction_tabs {\n  display: flex;\n  gap: 24px;\n  padding: 0 28px;\n  border-bottom: 1px solid var(--dsw-alias-border-l2);\n}\n.TeamAction_tabs button {\n  padding: 12px 0;\n  border: 0;\n  border-bottom: 2px solid transparent;\n  color: var(--dsw-alias-label-secondary);\n  background: transparent;\n  font: inherit;\n  font-size: 13px;\n  cursor: pointer;\n}\n.TeamAction_tabs button[aria-current] {\n  color: var(--dsw-alias-state-business-primary);\n  border-bottom-color: currentColor;\n}\n.TeamAction_metrics {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n  margin-bottom: 24px;\n}\n.TeamAction_metrics > div {\n  display: flex;\n  flex-direction: column;\n  gap: 5px;\n  padding: 16px 20px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 12px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n.TeamAction_metrics strong {\n  color: var(--dsw-alias-label-primary);\n  font-size: 26px;\n  font-weight: 600;\n}\n.TeamAction_metrics small {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 14px;\n  font-weight: 400;\n}\n.TeamAction_metrics span {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n}\n.TeamAction_overviewColumns {\n  display: grid;\n  grid-template-columns: minmax(200px, .75fr) minmax(300px, 1.4fr) minmax(220px, .9fr);\n  gap: 20px;\n  align-items: start;\n}\n.TeamAction_overviewColumns > * {\n  min-width: 0;\n}\n.TeamAction_taskGroup {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n}\n.TeamAction_taskGroup h4 {\n  display: flex;\n  align-items: center;\n  gap: 7px;\n  margin: 4px 0 1px;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  font-weight: 500;\n}\n.TeamAction_groupGrid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));\n  gap: 10px;\n  align-items: start;\n}\n.TeamAction_groupGrid .TeamAction_taskGroup {\n  min-width: 0;\n  padding: 10px 8px;\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-1);\n}\n.TeamAction_groupGrid .TeamAction_task {\n  padding: 10px 9px;\n}\n.TeamAction_groupHeading {\n  display: flex;\n  justify-content: space-between;\n  align-items: baseline;\n  gap: 5px;\n  min-width: 0;\n}\n.TeamAction_groupHeading h4 {\n  overflow-wrap: anywhere;\n}\n.TeamAction_groupHeading > span,\n.TeamAction_groupMore {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  white-space: nowrap;\n}\n.TeamAction_groupPeople {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n}\n.TeamAction_groupPerson {\n  min-width: 0;\n  padding: 3px 6px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 5px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-secondary);\n  font: inherit;\n  font-size: 11px;\n  cursor: pointer;\n  overflow-wrap: anywhere;\n}\n.TeamAction_groupPerson:hover,\n.TeamAction_groupPerson:focus-visible {\n  border-color: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-alias-state-business-primary);\n}\n.TeamAction_groupEmpty {\n  margin: 6px 0 0;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n}\n.TeamAction_inspector {\n  min-width: 0;\n  padding: 0 0 12px 18px;\n  border-inline-start: 1px solid var(--dsw-alias-border-l2);\n  overflow-wrap: anywhere;\n}\n.TeamAction_inspector > strong {\n  display: block;\n  color: var(--dsw-alias-label-primary);\n  font-size: 14px;\n}\n.TeamAction_inspector > p {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 1.6;\n  white-space: pre-wrap;\n}\n.TeamAction_inspector dl {\n  display: grid;\n  grid-template-columns: minmax(60px, .6fr) minmax(0, 1.4fr);\n  gap: 9px;\n  font-size: 12px;\n  line-height: 1.5;\n}\n.TeamAction_inspector dt {\n  color: var(--dsw-alias-label-tertiary);\n}\n.TeamAction_inspector dd {\n  margin: 0;\n  color: var(--dsw-alias-label-primary);\n  white-space: pre-wrap;\n}\n.TeamAction_workspacePanel .TeamAction_roster {\n  grid-template-columns: minmax(0, 1fr);\n  gap: 10px;\n}\n.TeamAction_workspacePanel .TeamAction_member {\n  padding: 14px;\n  border-radius: 12px;\n  width: 100%;\n  box-sizing: border-box;\n}\n.TeamAction_workspacePanel .TeamAction_memberModel {\n  display: inline;\n}\n.TeamAction_workspacePanel .TeamAction_memberText small {\n  white-space: normal;\n  overflow-wrap: anywhere;\n  line-height: 1.6;\n}\n.TeamAction_memberDescription {\n  margin: 5px 0;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 1.5;\n}\n.TeamAction_taskResult {\n  margin-top: 12px;\n  padding: 10px 12px;\n  border-radius: 8px;\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, transparent);\n}\n.TeamAction_taskResult > strong {\n  font-size: 11px;\n  color: var(--dsw-alias-state-business-primary);\n}\n.TeamAction_evidence {\n  margin: 8px 0;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n  overflow-wrap: anywhere;\n}\n.TeamAction_evidence summary {\n  cursor: pointer;\n}\n.TeamAction_evidence ul {\n  padding-inline-start: 18px;\n  line-height: 1.7;\n}\n.TeamAction_memory article {\n  padding: 16px 20px;\n  margin-top: 16px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 12px;\n}\n.TeamAction_memory h4 {\n  margin: 0 0 8px;\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n}\n.TeamAction_memory p {\n  white-space: pre-wrap;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 13px;\n  line-height: 1.8;\n}\n.TeamAction_roleColumns {\n  display: grid;\n  grid-template-columns: 210px minmax(0, 1fr);\n  gap: 24px;\n  margin-top: 18px;\n}\n.TeamAction_roleList {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.TeamAction_roleChoice {\n  display: flex;\n  flex-direction: column;\n  gap: 5px;\n  padding: 14px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  text-align: left;\n  cursor: pointer;\n}\n.TeamAction_roleChoice span {\n  font-size: 12px;\n  line-height: 1.5;\n}\n.TeamAction_roleChoice small {\n  font-size: 11px;\n  color: var(--dsw-alias-label-tertiary);\n  overflow-wrap: anywhere;\n}\n.TeamAction_roleSelected {\n  border-color: var(--dsw-alias-state-business-primary);\n  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, var(--dsw-alias-bg-layer-2));\n}\n.TeamAction_roleForm {\n  display: flex;\n  flex-direction: column;\n  gap: 18px;\n  min-width: 0;\n}\n.TeamAction_roleFormHeader {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  color: var(--dsw-alias-label-primary);\n}\n.TeamAction_roleForm label {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n}\n.TeamAction_roleForm input,\n.TeamAction_roleForm select,\n.TeamAction_roleForm textarea {\n  box-sizing: border-box;\n  width: 100%;\n  min-width: 0;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  padding: 10px 12px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  font-size: 13px;\n  line-height: 1.6;\n}\n.TeamAction_roleForm textarea {\n  resize: vertical;\n}\n.TeamAction_roleForm :is(input, select, textarea):focus {\n  outline: 2px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);\n  border-color: var(--dsw-alias-state-business-primary);\n}\n.TeamAction_roleForm select:disabled {\n  opacity: .55;\n}\n.TeamAction_modelFields {\n  display: grid;\n  grid-template-columns: 1fr 1.3fr .9fr;\n  gap: 12px;\n}\n.TeamAction_roleForm .TeamAction_instructions {\n  font-family:\n    ui-monospace,\n    Consolas,\n    monospace;\n  font-size: 12px;\n}\n.TeamAction_editorFooter {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 16px;\n  margin-top: 24px;\n  padding-top: 16px;\n  border-top: 1px solid var(--dsw-alias-border-l2);\n}\n.TeamAction_editorFooter > span {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n}\n.TeamAction_primaryButton,\n.TeamAction_secondaryButton {\n  border-radius: 8px;\n  padding: 9px 15px;\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n  white-space: nowrap;\n}\n.TeamAction_primaryButton {\n  border: 0;\n  background: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-alias-label-on-color, white);\n}\n.TeamAction_primaryButton:disabled {\n  opacity: .5;\n  cursor: wait;\n}\n.TeamAction_secondaryButton {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n}\n.TeamAction_textButton {\n  border: 0;\n  padding: 4px;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n}\n.TeamAction_textButton:hover {\n  color: var(--dsw-alias-state-error-primary);\n}\n@media (max-width: 760px) {\n  .TeamAction_workspacePanel {\n    width: calc(100vw - 32px);\n  }\n  .TeamAction_workspaceHeader {\n    padding: 20px;\n  }\n  .TeamAction_workspacePanel .TeamAction_body {\n    padding: 16px;\n  }\n  .TeamAction_overviewColumns,\n  .TeamAction_roleColumns {\n    grid-template-columns: 1fr;\n  }\n  .TeamAction_roleList {\n    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n  .TeamAction_modelFields {\n    grid-template-columns: 1fr;\n  }\n  .TeamAction_metrics > div {\n    padding: 12px;\n  }\n  .TeamAction_groupGrid {\n    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));\n  }\n}\n@media (min-width: 761px) and (max-width: 1050px) {\n  .TeamAction_overviewColumns {\n    grid-template-columns: minmax(200px, .8fr) minmax(280px, 1.2fr);\n  }\n  .TeamAction_inspector {\n    grid-column: 1 / -1;\n    padding: 14px 0 0;\n    border-inline-start: 0;\n    border-top: 1px solid var(--dsw-alias-border-l2);\n  }\n}\n\n/* packages/team/modules/ui/lib/types/client/TeamView.module.css */\n.TeamView_page {\n  box-sizing: border-box;\n  width: 100%;\n  height: 100%;\n  min-height: 0;\n  overflow: auto;\n  padding: 30px clamp(18px, 4vw, 54px) 20px;\n  padding-bottom: calc(var(--dsh-composer-height, 152px) + 20px);\n  scroll-padding-block-end: calc(var(--dsh-composer-height, 152px) + 20px);\n  color: var(--dsw-alias-label-primary);\n  font-size: 14px;\n  display: flex;\n  flex-direction: column;\n  container: TeamView_team-workbench / inline-size;\n}\n.TeamView_header,\n.TeamView_toolbar,\n.TeamView_inspectorPane > section > header,\n.TeamView_footer {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 20px;\n}\n.TeamView_header {\n  align-items: flex-start;\n  margin-bottom: 24px;\n}\n.TeamView_header h1 {\n  margin: 0 0 8px;\n  font-size: 24px;\n  font-weight: 500;\n}\n.TeamView_header p,\n.TeamView_hint,\n.TeamView_empty {\n  color: var(--dsw-alias-label-secondary);\n  line-height: 1.6;\n}\n.TeamView_header p {\n  margin: 0;\n}\n.TeamView_button,\n.TeamView_search {\n  box-sizing: border-box;\n  padding: 8px 13px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  color: inherit;\n  background: transparent;\n  font: inherit;\n}\n.TeamView_button {\n  cursor: pointer;\n  white-space: nowrap;\n}\n.TeamView_button:hover,\n.TeamView_memberButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n.TeamView_button:disabled {\n  opacity: .5;\n  cursor: default;\n}\n.TeamView_search {\n  width: 230px;\n  max-width: 45%;\n}\n.TeamView_search:focus-visible,\n.TeamView_button:focus-visible,\n.TeamView_textButton:focus-visible,\n.TeamView_tabs button:focus-visible,\n.TeamView_memberButton:focus-visible,\n.TeamView_memberModelForm select:focus-visible,\n.TeamView_memberModelForm input:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 2px;\n}\n.TeamView_goal {\n  display: flex;\n  align-items: baseline;\n  gap: 22px;\n  padding: 15px 0;\n  border-block: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamView_goal > span {\n  color: var(--dsw-alias-label-secondary);\n  white-space: nowrap;\n}\n.TeamView_goal p {\n  flex: 1;\n  min-width: 0;\n  margin: 0;\n  line-height: 1.6;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  display: -webkit-box;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: 3;\n  overflow: hidden;\n}\n.TeamView_textButton {\n  padding: 4px 0;\n  border: 0;\n  background: none;\n  color: var(--dsw-alias-state-business-primary);\n  font: inherit;\n  cursor: pointer;\n  white-space: nowrap;\n}\n.TeamView_toolbar {\n  padding-top: 20px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamView_tabs {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0 24px;\n}\n.TeamView_tabs button {\n  padding: 13px 3px;\n  border: 0;\n  border-bottom: 2px solid transparent;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary);\n  font: inherit;\n  cursor: pointer;\n}\n.TeamView_tabs button[aria-selected=true] {\n  color: var(--dsw-alias-state-business-primary);\n  border-bottom-color: var(--dsw-alias-state-business-primary);\n}\n.TeamView_content {\n  min-width: 0;\n  flex: 1;\n}\n.TeamView_overviewGrid {\n  display: grid;\n  grid-template-columns: minmax(210px, .85fr) minmax(290px, 1.6fr) minmax(245px, 1fr);\n  min-height: 430px;\n}\n.TeamView_overviewGrid > * {\n  min-width: 0;\n  padding: 18px 14px;\n}\n@container TeamView_team-workbench (min-width: 1000px) {\n  .TeamView_overviewGrid {\n    height: clamp(430px, calc(100dvh - var(--dsh-composer-height, 152px) - 280px), 840px);\n    overflow: hidden;\n  }\n  .TeamView_overviewGrid > * {\n    min-height: 0;\n    overflow-y: auto;\n  }\n}\n.TeamView_overviewGrid h2 {\n  display: flex;\n  align-items: baseline;\n  gap: 6px;\n  margin: 0 0 14px;\n  font-size: 14px;\n  font-weight: 500;\n}\n.TeamView_overviewGrid h2 small,\n.TeamView_groupLane header small {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  font-weight: 400;\n}\n.TeamView_rosterPane {\n  border-inline-end: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamView_memberList {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n.TeamView_memberItem {\n  margin: 2px 0;\n  border-radius: 7px;\n}\n.TeamView_memberButton {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  min-width: 0;\n  padding: 9px 6px;\n  border: 0;\n  border-radius: 7px;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n  cursor: pointer;\n  text-align: start;\n}\n.TeamView_memberButton > svg {\n  flex-shrink: 0;\n}\n.TeamView_memberIdentity {\n  display: flex;\n  flex: 1;\n  flex-direction: column;\n  min-width: 0;\n}\n.TeamView_memberIdentity strong {\n  font-size: 12px;\n  font-weight: 500;\n  overflow-wrap: anywhere;\n}\n.TeamView_roleSummary {\n  overflow: hidden;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.TeamView_memberStatus {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  white-space: nowrap;\n}\n.TeamView_memberStatus span:last-child {\n  display: inline;\n}\n.TeamView_memberItem:hover,\n.TeamView_selectedRow {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n.TeamView_model {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n  overflow-wrap: anywhere;\n}\n.TeamView_modelNote {\n  display: block;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n}\n.TeamView_memberBadges {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  margin-block: 3px;\n}\n.TeamView_memberBadges small {\n  padding: 1px 5px;\n  border-radius: 4px;\n  background: var(--dsw-alias-bg-layer-1);\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n}\n.TeamView_summary {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px 20px;\n  padding: 0 0 18px;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n}\n.TeamView_summary > span {\n  display: inline-flex;\n  align-items: baseline;\n  gap: 6px;\n}\n.TeamView_summary strong {\n  color: var(--dsw-alias-label-primary);\n  font-size: 17px;\n  font-weight: 500;\n}\n.TeamView_boardEmpty {\n  display: flex;\n  align-items: flex-start;\n  flex-direction: column;\n  gap: 10px;\n  padding: 28px 12px;\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 8px;\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamView_boardEmpty p {\n  margin: 0;\n}\n.TeamView_boardEmpty small {\n  line-height: 1.6;\n}\n.TeamView_boardPane > header,\n.TeamView_groupLane > header {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 8px;\n}\n.TeamView_boardPane > header > span {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n}\n.TeamView_groupBoard {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));\n  align-items: start;\n  gap: 10px;\n}\n.TeamView_groupLane {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  min-width: 0;\n  padding: 11px 8px;\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-1);\n}\n.TeamView_groupLane h3 {\n  margin: 0;\n  font-size: 12px;\n  font-weight: 500;\n  overflow-wrap: anywhere;\n}\n.TeamView_groupMembers {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  min-height: 27px;\n}\n.TeamView_groupMembers button,\n.TeamView_groupMembers span {\n  padding: 3px 5px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 4px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-secondary);\n  font: inherit;\n  font-size: 11px;\n  overflow-wrap: anywhere;\n}\n.TeamView_groupMembers button {\n  cursor: pointer;\n}\n.TeamView_groupMembers button:hover {\n  color: var(--dsw-alias-state-business-primary);\n  border-color: currentColor;\n}\n.TeamView_boardTask {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  width: 100%;\n  min-width: 0;\n  padding: 11px 9px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: inherit;\n  font: inherit;\n  text-align: start;\n  cursor: pointer;\n}\n.TeamView_boardTask:hover,\n.TeamView_boardTaskSelected {\n  border-color: var(--dsw-alias-state-business-primary);\n}\n.TeamView_boardTask small {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  overflow-wrap: anywhere;\n}\n.TeamView_boardTask strong {\n  font-size: 12px;\n  font-weight: 500;\n  overflow-wrap: anywhere;\n}\n.TeamView_boardTask > span {\n  display: -webkit-box;\n  overflow: hidden;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: 3;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n  line-height: 1.5;\n}\n.TeamView_inspectorPane {\n  border-inline-start: 1px solid var(--dsw-alias-border-l1);\n  overflow-wrap: anywhere;\n}\n.TeamView_inspectorPane > section > header {\n  align-items: flex-start;\n  flex-direction: column;\n  gap: 8px;\n  margin-bottom: 12px;\n}\n.TeamView_inspectorPane h2 {\n  margin: 0;\n}\n.TeamView_inspectorPane h3 {\n  margin-top: 22px;\n  font-size: 13px;\n  font-weight: 500;\n}\n.TeamView_inspectorPane p {\n  white-space: pre-wrap;\n  line-height: 1.6;\n}\n.TeamView_inspectorPane dl {\n  display: grid;\n  grid-template-columns: minmax(60px, .6fr) minmax(0, 1.4fr);\n  gap: 8px;\n  margin: 12px 0;\n  font-size: 12px;\n}\n.TeamView_inspectorPane dt {\n  color: var(--dsw-alias-label-tertiary);\n}\n.TeamView_inspectorPane dd {\n  margin: 0;\n  overflow-wrap: anywhere;\n}\n.TeamView_inspectorPane details {\n  margin-top: 12px;\n}\n.TeamView_inspectorPane summary {\n  cursor: pointer;\n}\n.TeamView_hint {\n  font-size: 12px;\n  margin: 16px 0;\n}\n.TeamView_empty {\n  padding: 24px 0;\n}\n.TeamView_empty .TeamView_button {\n  margin-inline-start: 12px;\n}\n.TeamView_memberActions {\n  margin-block: 20px;\n  padding-block: 8px 18px;\n  border-block: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamView_memberActions .TeamView_button {\n  margin-inline-end: 10px;\n}\n.TeamView_memberModelForm {\n  display: grid;\n  gap: 10px;\n  margin-block-end: 18px;\n}\n.TeamView_memberModelForm h4,\n.TeamView_memberModelForm p {\n  margin: 0;\n}\n.TeamView_memberModelForm [role=status] .TeamView_button {\n  margin-inline-start: 12px;\n}\n.TeamView_memberModelForm label {\n  display: grid;\n  gap: 5px;\n}\n.TeamView_memberModelForm select,\n.TeamView_memberModelForm input {\n  min-width: 0;\n  max-width: 100%;\n  padding: 8px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  color: inherit;\n  background: var(--dsw-alias-bg-layer-2);\n  font: inherit;\n}\n.TeamView_memberModelForm .TeamView_button {\n  justify-self: start;\n}\n.TeamView_memberActions .TeamView_preservedText {\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamView_archive {\n  margin-block: 28px;\n  padding-block: 18px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamView_archive > .TeamView_button {\n  margin-block-end: 8px;\n}\n.TeamView_preservedText,\n.TeamView_memory p,\n.TeamView_taskBody p {\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  line-height: 1.7;\n}\n.TeamView_task {\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamView_task > summary {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) 140px 90px;\n  gap: 18px;\n  padding: 18px 0;\n  cursor: pointer;\n}\n.TeamView_task > summary strong {\n  font-weight: 500;\n}\n.TeamView_task > summary > span {\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamView_taskBody {\n  padding-bottom: 15px;\n  max-width: 920px;\n}\n.TeamView_taskBody h4 {\n  margin-bottom: 8px;\n  font-size: 13px;\n}\n.TeamView_taskBody li {\n  overflow-wrap: anywhere;\n  line-height: 1.7;\n}\n.TeamView_memory {\n  max-width: 920px;\n  padding-block: 12px;\n}\n.TeamView_memory section {\n  margin: 25px 0;\n}\n.TeamView_memory h2 {\n  font-size: 15px;\n  font-weight: 500;\n}\n.TeamView_diagnosticGrid {\n  display: grid;\n  grid-template-columns: minmax(110px, .8fr) minmax(0, 1.2fr);\n  gap: 12px;\n}\n.TeamView_diagnosticGrid dt {\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamView_diagnosticGrid dd {\n  margin: 0;\n  overflow-wrap: anywhere;\n}\n.TeamView_settings {\n  margin: 24px 0;\n  flex: 1;\n}\n.TeamView_footer {\n  margin-top: auto;\n  padding-top: 20px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n  font-size: 13px;\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamView_error {\n  color: var(--dsw-alias-state-error-primary);\n  white-space: pre-wrap;\n}\n@media (max-width: 700px) {\n  .TeamView_page {\n    padding: 22px 18px calc(var(--dsh-composer-height, 152px) + 18px);\n  }\n  .TeamView_header h1 {\n    font-size: 22px;\n  }\n  .TeamView_header {\n    gap: 12px;\n  }\n  .TeamView_goal {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr) auto;\n    gap: 10px;\n  }\n  .TeamView_goal p {\n    grid-column: 1 / -1;\n  }\n  .TeamView_goal .TeamView_textButton {\n    grid-column: 2;\n    grid-row: 1;\n  }\n  .TeamView_toolbar {\n    flex-wrap: wrap;\n    gap: 6px;\n  }\n  .TeamView_search {\n    width: 100%;\n    max-width: none;\n    order: -1;\n    margin-bottom: 4px;\n  }\n}\n@container TeamView_team-workbench (max-width: 599px) {\n  .TeamView_overviewGrid {\n    grid-template-columns: minmax(0, 1fr);\n  }\n  .TeamView_rosterPane {\n    border-inline-end: 0;\n    border-bottom: 1px solid var(--dsw-alias-border-l1);\n  }\n  .TeamView_inspectorPane {\n    border-inline-start: 0;\n    border-top: 1px solid var(--dsw-alias-border-l1);\n  }\n  .TeamView_groupBoard {\n    grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));\n  }\n  .TeamView_toolbar {\n    flex-wrap: wrap;\n    gap: 6px;\n  }\n  .TeamView_search {\n    width: 100%;\n    max-width: none;\n    order: -1;\n    margin-bottom: 4px;\n  }\n  .TeamView_header {\n    flex-wrap: wrap;\n  }\n  .TeamView_tabs {\n    gap: 0 14px;\n  }\n  .TeamView_task > summary {\n    grid-template-columns: minmax(0, 1fr) auto;\n    gap: 8px;\n  }\n  .TeamView_task > summary > span:nth-child(2) {\n    grid-row: 2;\n  }\n}\n@container TeamView_team-workbench (min-width: 600px) and (max-width: 999px) {\n  .TeamView_overviewGrid {\n    grid-template-columns: minmax(210px, .8fr) minmax(0, 1.5fr);\n  }\n  .TeamView_inspectorPane {\n    grid-column: 1 / -1;\n    border-inline-start: 0;\n    border-top: 1px solid var(--dsw-alias-border-l1);\n  }\n}\n.TeamView_page {\n  background: var(--dsw-alias-bg-base, var(--dsw-alias-bg-layer-1));\n}\n.TeamView_headerActions {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n.TeamView_goal {\n  padding: 15px 17px;\n  margin-bottom: 4px;\n  background: var(--dsw-alias-bg-layer-2);\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 10px;\n}\n.TeamView_summary {\n  gap: 8px 24px;\n}\n.TeamView_overviewGrid {\n  gap: 14px;\n  margin-top: 17px;\n  grid-template-columns: minmax(230px, .85fr) minmax(310px, 1.6fr) minmax(260px, 1fr);\n}\n.TeamView_overviewGrid > * {\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 11px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n.TeamView_groupLabel {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  padding: 13px 8px 7px;\n  list-style: none;\n}\n.TeamView_memberItem {\n  margin-block: 3px;\n  content-visibility: auto;\n  contain-intrinsic-size: auto 100px;\n}\n.TeamView_memberButton {\n  padding: 10px 8px;\n  align-items: flex-start;\n}\n.TeamView_selectedRow {\n  box-shadow: inset 2px 0 var(--dsw-alias-state-business-primary);\n}\n.TeamView_groupBoard {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.TeamView_groupLane {\n  background: none;\n  padding: 0;\n}\n.TeamView_groupLane > header {\n  padding-block: 8px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamView_boardTask {\n  padding: 13px 12px;\n  border-radius: 9px;\n  gap: 8px;\n}\n.TeamView_boardFilters {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  margin: 8px 0 18px;\n}\n.TeamView_boardFilters .TeamView_search {\n  width: auto;\n  flex: 1;\n  min-width: 140px;\n  max-width: none;\n  margin: 0;\n}\n.TeamView_filterSelect {\n  min-width: 90px;\n  max-width: 100%;\n  padding: 6px 8px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  color: inherit;\n  background: var(--dsw-alias-bg-layer-2);\n  font: inherit;\n  font-size: 12px;\n}\n.TeamView_compact .TeamView_memberButton {\n  padding-block: 6px;\n}\n.TeamView_compact .TeamView_roleSummary {\n  display: none;\n}\n.TeamView_compact .TeamView_boardTask {\n  padding-block: 8px;\n  gap: 5px;\n}\n@container TeamView_team-workbench (max-width: 599px) {\n  .TeamView_overviewGrid {\n    grid-template-columns: minmax(0, 1fr);\n  }\n  .TeamView_headerActions {\n    width: 100%;\n  }\n  .TeamView_headerActions > .TeamView_button {\n    flex: 1;\n  }\n  .TeamView_boardFilters .TeamView_search {\n    order: 0;\n  }\n}\n@container TeamView_team-workbench (min-width: 600px) and (max-width: 1050px) {\n  .TeamView_overviewGrid {\n    grid-template-columns: minmax(220px, .8fr) minmax(0, 1.5fr);\n  }\n  .TeamView_inspectorPane {\n    grid-column: 1 / -1;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  .TeamView_page {\n    scroll-behavior: auto;\n  }\n}\n\n/* packages/team/modules/ui/lib/types/client/CurrentTeamRoles.module.css */\n.CurrentTeamRoles_current {\n  margin: 0 0 22px;\n  padding: 14px;\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 9px;\n}\n.CurrentTeamRoles_current header {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  margin-bottom: 8px;\n}\n.CurrentTeamRoles_current h3 {\n  margin: 0;\n  font-size: 14px;\n  font-weight: 600;\n}\n.CurrentTeamRoles_current header small,\n.CurrentTeamRoles_current p {\n  color: var(--dsw-alias-label-secondary);\n}\n.CurrentTeamRoles_planned {\n  margin: 0 0 12px;\n  padding: 12px;\n  border-radius: 7px;\n  background: var(--dsw-alias-bg-layer-1);\n}\n.CurrentTeamRoles_planned h4 {\n  margin: 0 0 7px;\n  font-size: 12px;\n  font-weight: 600;\n}\n.CurrentTeamRoles_planned p {\n  margin: 0;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  font-size: 12px;\n  line-height: 1.6;\n}\n.CurrentTeamRoles_current ul {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 6px;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n.CurrentTeamRoles_member {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 10px;\n  min-width: 0;\n  padding: 9px;\n  border-radius: 7px;\n  background: var(--dsw-alias-bg-layer-1);\n}\n.CurrentTeamRoles_member > div:first-child {\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n}\n.CurrentTeamRoles_member strong {\n  font-size: 12px;\n  font-weight: 500;\n  overflow-wrap: anywhere;\n}\n.CurrentTeamRoles_member span {\n  font-size: 11px;\n  color: var(--dsw-alias-label-secondary);\n  overflow-wrap: anywhere;\n}\n.CurrentTeamRoles_route {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  min-width: 72px;\n  text-align: end;\n}\n.CurrentTeamRoles_route small {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n/* packages/team/modules/ui/lib/types/client/TeamExperts.module.css */\n.TeamExperts_catalog {\n  padding-block: 20px;\n  color: var(--dsw-alias-label-primary);\n}\n.TeamExperts_hint {\n  margin: 0;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 1.7;\n}\n.TeamExperts_error {\n  color: var(--dsw-alias-state-error-primary);\n  font-size: 13px;\n}\n.TeamExperts_layout {\n  display: grid;\n  grid-template-columns: 216px minmax(0, 1fr);\n  gap: 28px;\n  margin-top: 20px;\n  align-items: start;\n}\n.TeamExperts_sidebar,\n.TeamExperts_editor {\n  min-width: 0;\n}\n.TeamExperts_sidebar {\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n}\n.TeamExperts_choices {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  max-height: 540px;\n  overflow-y: auto;\n}\n.TeamExperts_choice {\n  display: flex;\n  flex-direction: column;\n  gap: 5px;\n  padding: 12px;\n  border: 0;\n  border-radius: 8px;\n  background: transparent;\n  color: inherit;\n  text-align: start;\n  cursor: pointer;\n  overflow-wrap: anywhere;\n}\n.TeamExperts_choice[aria-pressed=true] {\n  background: var(--dsw-alias-bg-layer-2);\n}\n.TeamExperts_choice strong {\n  font-size: 13px;\n  font-weight: 600;\n}\n.TeamExperts_choice span,\n.TeamExperts_choice small {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 1.5;\n}\n.TeamExperts_actions,\n.TeamExperts_footer,\n.TeamExperts_editorHeader,\n.TeamExperts_binding {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.TeamExperts_editorHeader {\n  margin-bottom: 20px;\n}\n.TeamExperts_editorHeader h2 {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n  overflow-wrap: anywhere;\n}\n.TeamExperts_fields {\n  min-width: 0;\n  padding: 0;\n  margin: 0;\n  border: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 17px;\n}\n.TeamExperts_fields label {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n}\n.TeamExperts_field {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n}\n.TeamExperts_catalog input:not([type=checkbox]),\n.TeamExperts_catalog textarea,\n.TeamExperts_catalog select {\n  box-sizing: border-box;\n  min-width: 0;\n  width: 100%;\n  padding: 9px 11px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  background: var(--dsw-alias-bg-layer-1);\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  font-size: 13px;\n  line-height: 1.6;\n}\n.TeamExperts_catalog textarea {\n  resize: vertical;\n}\n.TeamExperts_catalog .TeamExperts_instructions {\n  font-family:\n    ui-monospace,\n    Consolas,\n    monospace;\n  font-size: 12px;\n}\n.TeamExperts_catalog :is(input, textarea, select, button):focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n.TeamExperts_catalog .TeamExperts_checkbox {\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n  gap: 8px;\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamExperts_models {\n  display: grid;\n  grid-template-columns: 1fr 1.2fr 1fr;\n  gap: 12px;\n}\n.TeamExperts_button,\n.TeamExperts_primaryButton,\n.TeamExperts_textButton {\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n  padding: 8px 12px;\n  border-radius: 7px;\n}\n.TeamExperts_button {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: transparent;\n  color: var(--dsw-alias-label-primary);\n}\n.TeamExperts_primaryButton {\n  border: 0;\n  background: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-alias-label-on-color, white);\n}\n.TeamExperts_textButton {\n  border: 0;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamExperts_catalog :disabled {\n  opacity: .5;\n  cursor: default;\n}\n.TeamExperts_footer {\n  margin-top: 20px;\n  padding-top: 16px;\n  border-top: 1px solid var(--dsw-alias-border-l2);\n}\n.TeamExperts_bindings {\n  margin-top: 30px;\n}\n.TeamExperts_bindings h3 {\n  margin: 0 0 8px;\n  font-size: 13px;\n  font-weight: 600;\n}\n.TeamExperts_bindings > .TeamExperts_hint {\n  margin-block: 8px;\n}\n.TeamExperts_binding {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n  padding-block: 8px;\n  font-size: 12px;\n  overflow-wrap: anywhere;\n}\n.TeamExperts_conflict {\n  padding: 12px;\n  margin-bottom: 18px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  font-size: 12px;\n}\n@media (max-width: 900px) {\n  .TeamExperts_models {\n    grid-template-columns: 1fr;\n  }\n}\n@media (max-width: 640px) {\n  .TeamExperts_layout {\n    grid-template-columns: 1fr;\n    gap: 24px;\n  }\n  .TeamExperts_choices {\n    max-height: 180px;\n  }\n}\n\n/* packages/team/modules/ui/lib/types/client/TeamGoals.module.css */\n.TeamGoals_page {\n  max-width: 920px;\n  padding-block: 22px;\n}\n.TeamGoals_header {\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  gap: 20px;\n}\n.TeamGoals_page h2 {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 500;\n}\n.TeamGoals_page h3 {\n  margin: 0 0 14px;\n  font-size: 15px;\n  font-weight: 500;\n}\n.TeamGoals_hint,\n.TeamGoals_status {\n  color: var(--dsw-alias-label-secondary);\n  line-height: 1.6;\n}\n.TeamGoals_hint {\n  margin: 9px 0 16px;\n  font-size: 13px;\n}\n.TeamGoals_status {\n  flex-shrink: 0;\n  font-size: 13px;\n}\n.TeamGoals_definition {\n  margin: 8px 0 24px;\n}\n.TeamGoals_definition > div {\n  display: grid;\n  grid-template-columns: 150px minmax(0, 1fr);\n  gap: 20px;\n  padding: 12px 0;\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamGoals_definition dt {\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamGoals_definition dd {\n  margin: 0;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  line-height: 1.7;\n}\n.TeamGoals_definition ul {\n  margin: 0;\n  padding-inline-start: 19px;\n}\n.TeamGoals_pending,\n.TeamGoals_editor {\n  margin-top: 24px;\n  padding-top: 22px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamGoals_pending summary {\n  margin-bottom: 16px;\n  cursor: pointer;\n}\n.TeamGoals_pending p,\n.TeamGoals_notice {\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  line-height: 1.7;\n}\n.TeamGoals_notice {\n  padding: 12px 0;\n  color: var(--dsw-alias-label-secondary);\n}\n.TeamGoals_notice p {\n  margin: 0 0 12px;\n}\n.TeamGoals_actions {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 20px;\n  margin-top: 20px;\n}\n.TeamGoals_fields {\n  border: 0;\n  margin: 0;\n  padding: 0;\n  min-width: 0;\n}\n.TeamGoals_field {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  margin-bottom: 20px;\n}\n.TeamGoals_field label {\n  font-size: 13px;\n}\n.TeamGoals_field textarea,\n.TeamGoals_field select,\n.TeamGoals_button {\n  box-sizing: border-box;\n  padding: 9px 12px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n}\n.TeamGoals_field textarea {\n  display: block;\n  width: 100%;\n  min-height: 70px;\n  resize: vertical;\n  line-height: 1.6;\n}\n.TeamGoals_field select {\n  max-width: 360px;\n}\n.TeamGoals_field .TeamGoals_hint {\n  margin: 0;\n}\n.TeamGoals_button {\n  cursor: pointer;\n}\n.TeamGoals_button:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n.TeamGoals_textButton {\n  padding: 4px 0;\n  border: 0;\n  background: none;\n  color: var(--dsw-alias-state-business-primary);\n  font: inherit;\n  cursor: pointer;\n}\n.TeamGoals_button:disabled,\n.TeamGoals_textButton:disabled {\n  opacity: .5;\n  cursor: default;\n}\n.TeamGoals_button:focus-visible,\n.TeamGoals_textButton:focus-visible,\n.TeamGoals_field textarea:focus-visible,\n.TeamGoals_field select:focus-visible,\n.TeamGoals_pending summary:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 2px;\n}\n.TeamGoals_error {\n  color: var(--dsw-alias-state-error-primary);\n  white-space: pre-wrap;\n}\n@media (max-width: 700px) {\n  .TeamGoals_header {\n    flex-wrap: wrap;\n    gap: 4px;\n  }\n  .TeamGoals_definition > div {\n    grid-template-columns: minmax(0, 1fr);\n    gap: 6px;\n  }\n  .TeamGoals_field select {\n    width: 100%;\n    max-width: none;\n  }\n}\n\n/* packages/team/modules/ui/lib/types/client/TeamMailbox.module.css */\n.TeamMailbox_page {\n  max-width: 920px;\n  padding-block: 18px;\n}\n.TeamMailbox_heading,\n.TeamMailbox_row,\n.TeamMailbox_pagination {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 16px;\n}\n.TeamMailbox_heading p {\n  margin: 0;\n  color: var(--dsw-alias-label-secondary);\n  line-height: 1.6;\n}\n.TeamMailbox_heading button,\n.TeamMailbox_row > button:not(.TeamMailbox_message),\n.TeamMailbox_pagination button {\n  padding: 7px 11px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 7px;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n  cursor: pointer;\n}\n.TeamMailbox_heading button:disabled,\n.TeamMailbox_row button:disabled,\n.TeamMailbox_pagination button:disabled {\n  opacity: .5;\n  cursor: default;\n}\n.TeamMailbox_list {\n  list-style: none;\n  margin: 18px 0;\n  padding: 0;\n}\n.TeamMailbox_item {\n  padding: 13px 0;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n}\n.TeamMailbox_message {\n  display: flex;\n  flex: 1;\n  min-width: 0;\n  flex-direction: column;\n  gap: 5px;\n  text-align: start;\n  border: 0;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n  cursor: pointer;\n}\n.TeamMailbox_message strong,\n.TeamMailbox_body {\n  overflow-wrap: anywhere;\n}\n.TeamMailbox_message strong {\n  font-weight: 500;\n}\n.TeamMailbox_message span,\n.TeamMailbox_pagination {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n}\n.TeamMailbox_detail {\n  margin: 12px 0 0;\n  padding: 12px 16px;\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 7px;\n}\n.TeamMailbox_detail p {\n  margin: 5px 0;\n  overflow-wrap: anywhere;\n}\n.TeamMailbox_body {\n  white-space: pre-wrap;\n  line-height: 1.6;\n}\n.TeamMailbox_error {\n  color: var(--dsw-alias-state-error-primary);\n  overflow-wrap: anywhere;\n}\n.TeamMailbox_pagination {\n  justify-content: flex-end;\n  padding-block: 12px;\n}\n.TeamMailbox_heading button:focus-visible,\n.TeamMailbox_row button:focus-visible,\n.TeamMailbox_pagination button:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 2px;\n}\n@media (max-width: 700px) {\n  .TeamMailbox_heading,\n  .TeamMailbox_row {\n    align-items: flex-start;\n  }\n  .TeamMailbox_row {\n    flex-wrap: wrap;\n  }\n  .TeamMailbox_message {\n    flex-basis: 100%;\n  }\n}\n\n/* packages/team/modules/ui/lib/types/client/MemberSkills.module.css */\n.MemberSkills_skills {\n  margin-top: 24px;\n  overflow-wrap: anywhere;\n}\n.MemberSkills_skills h3 {\n  margin-bottom: 8px;\n  font-size: 14px;\n  font-weight: 500;\n}\n.MemberSkills_hint {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 1.6;\n}\n.MemberSkills_choices,\n.MemberSkills_versions ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n.MemberSkills_choices li {\n  margin: 14px 0;\n}\n.MemberSkills_choices p {\n  margin: 0 0 3px;\n  white-space: pre-wrap;\n  line-height: 1.7;\n}\n.MemberSkills_choices span,\n.MemberSkills_versions {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n}\n.MemberSkills_versions summary {\n  cursor: pointer;\n}\n.MemberSkills_versions p {\n  margin: 10px 0;\n}\n.MemberSkills_versions li {\n  margin-top: 12px;\n  line-height: 1.6;\n}\n.MemberSkills_versions code {\n  display: block;\n  margin-top: 3px;\n  white-space: pre-wrap;\n}\n";document.head.appendChild(tag);}
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/team/modules/ui/lib/types/client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject2
});
module.exports = __toCommonJS(index_exports);

// packages/team/modules/runtime/lib/typert.remote-client.js
var import_zod = require("zod");

// source/packages/typert/protocol/src/remote-info.ts
function createTypertRemoteInfo(spec, zod) {
  return new RemoteInfo(spec, zod);
}
var RemoteInfo = class {
  constructor(spec, zod) {
    this.spec = spec;
    this.zod = zod;
  }
  index;
  get package() {
    return this.spec.package;
  }
  get descriptors() {
    return this.resolve().descriptors;
  }
  get methods() {
    return this.resolve().methods;
  }
  resolve() {
    if (this.index !== void 0) return this.index;
    const zod = this.zod;
    const descriptors = [];
    const methods = /* @__PURE__ */ Object.create(null);
    for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
      const separator = endpoint.indexOf("/");
      const namespace = endpoint.slice(0, separator);
      const method = endpoint.slice(separator + 1);
      const parameters = definition.parameters.map((parameter) => ({ ...parameter, wire: parameter.wire ?? parameter.name }));
      const descriptor = {
        ...definition,
        id: `${this.spec.package}#${endpoint}`,
        namespace,
        method,
        parameters,
        result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
      };
      if (definition.invocation.kind === "direct") {
        const inputs = [];
        const direct = Object.assign(descriptor, {
          input(options) {
            const strict = options?.strict === true;
            return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
          },
          invoke(remote, input, signal) {
            const named = input;
            const values = parameters.map((parameter) => named[parameter.wire]);
            if (definition.cancellation !== void 0) values.push(signal);
            const receiver = Reflect.get(remote, namespace);
            const call = Reflect.get(receiver, method);
            return call.apply(receiver, values);
          }
        });
        methods[endpoint] = direct;
      }
      descriptors.push(descriptor);
    }
    return this.index = { descriptors, methods };
  }
};
function optional(parameter) {
  return parameter.source === "json" && parameter.acceptsUndefined === true;
}
var NamedInput = class {
  constructor(parameters, strict, zod) {
    this.parameters = parameters;
    this.strict = strict;
    this.zod = zod;
  }
  schema;
  projection;
  codec(parameter) {
    return this.strict ? parameter.strictCodec : parameter.codec;
  }
  create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
    const value = this.codec(parameter).create();
    return [parameter.wire, optional(parameter) ? value.optional() : value.nonoptional()];
  })));
  get jsonSchema() {
    return this.project().jsonSchema;
  }
  get jsonSchemaError() {
    return this.project().jsonSchemaError;
  }
  project() {
    if (this.projection !== void 0) return this.projection;
    const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
    if (unavailable !== void 0) {
      return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
    }
    return this.projection = {
      jsonSchema: {
        type: "object",
        properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
          ...this.codec(parameter).jsonSchema,
          ...parameter.description === void 0 ? {} : { description: parameter.description }
        }])),
        required: this.parameters.filter((parameter) => !optional(parameter)).map((parameter) => parameter.wire),
        additionalProperties: false
      }
    };
  }
};
var ResultValue = class {
  constructor(spec) {
    this.spec = spec;
  }
  projection;
  get mode() {
    return this.spec.mode;
  }
  get typeSymbol() {
    return this.spec.typeSymbol;
  }
  get create() {
    return this.spec.create;
  }
  get decode() {
    return this.spec.decode;
  }
  get encode() {
    return this.spec.encode;
  }
  get description() {
    return this.spec.description;
  }
  get jsonSchemaError() {
    return this.spec.jsonSchemaError;
  }
  get jsonSchema() {
    if (this.projection === void 0) {
      const schema = this.spec.jsonSchema;
      this.projection = { value: schema === void 0 ? void 0 : { ...schema, description: this.spec.description } };
    }
    return this.projection.value;
  }
};

// packages/team/modules/runtime/lib/typert.remote-client.js
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_1$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_result$schema$value ??= import_zod.z.object({
  "messageId": import_zod.z.string().readonly(),
  "status": import_zod.z.union([import_zod.z.literal("accepted"), import_zod.z.literal("queued")]).readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_1$schema$value ??= import_zod.z.object({
  "expectedRevision": import_zod.z.number().readonly().optional().describe("Optional route revision from listMembers; concurrent conflicting changes are rejected."),
  "target": import_zod.z.string().readonly(),
  "modelProvider": import_zod.z.string().readonly(),
  "model": import_zod.z.string().readonly(),
  "reasoningEffort": import_zod.z.string().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "parentId": import_zod.z.string().readonly().optional(),
  "parentName": import_zod.z.string().readonly().optional(),
  "name": import_zod.z.string().readonly(),
  "role": import_zod.z.union([import_zod.z.literal("lead"), import_zod.z.literal("teammate")]).readonly(),
  "status": import_zod.z.union([import_zod.z.literal("failed"), import_zod.z.literal("running"), import_zod.z.literal("provisioning"), import_zod.z.literal("retired"), import_zod.z.literal("inactive")]).readonly(),
  "description": import_zod.z.string().readonly().optional(),
  "provider": import_zod.z.string().readonly().optional(),
  "context": import_zod.z.union([import_zod.z.literal("fresh"), import_zod.z.literal("fork")]).readonly().optional(),
  "diagnostics": import_zod.z.array(import_zod.z.string()).readonly(),
  "modelRouteRevision": import_zod.z.number().readonly().optional().describe("Revision of an in-place model choice; absent when still using the creation route."),
  "roleRevision": import_zod.z.number().readonly().optional().describe("Revision of the current responsibility; omitted for the creation-time role."),
  "teamFunction": import_zod.z.union([import_zod.z.literal("planning_adviser"), import_zod.z.literal("quality_adviser"), import_zod.z.literal("domain_adviser"), import_zod.z.literal("group_lead"), import_zod.z.literal("executor"), import_zod.z.literal("verifier")]).readonly().optional().describe("Team responsibility chosen by the delegating member; absent historical rows stay valid."),
  "expert": import_zod.z.object({
    "id": import_zod.z.string().readonly(),
    "revision": import_zod.z.number().readonly(),
    "name": import_zod.z.string().readonly()
  }).readonly().optional().describe("Creation-time profile identity; repeated assignment reuses this member."),
  "modelProvider": import_zod.z.string().readonly().optional().describe("Registered language-model provider, distinct from the subagent provider."),
  "model": import_zod.z.string().readonly().optional().describe("Exact model selected when the member was created."),
  "reasoningEffort": import_zod.z.string().readonly().optional().describe("Adapter-supported reasoning effort selected for this member."),
  "persona": import_zod.z.string().readonly().optional().describe("Persona persisted with the continuation and reapplied on resume.")
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_1$schema$value ??= import_zod.z.object({
  "target": import_zod.z.string().readonly(),
  "expectedRevision": import_zod.z.number().readonly(),
  "teamFunction": import_zod.z.union([import_zod.z.literal("planning_adviser"), import_zod.z.literal("quality_adviser"), import_zod.z.literal("domain_adviser"), import_zod.z.literal("group_lead"), import_zod.z.literal("executor"), import_zod.z.literal("verifier")]).readonly(),
  "reason": import_zod.z.string().readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "parentId": import_zod.z.string().readonly().optional(),
  "parentName": import_zod.z.string().readonly().optional(),
  "name": import_zod.z.string().readonly(),
  "role": import_zod.z.union([import_zod.z.literal("lead"), import_zod.z.literal("teammate")]).readonly(),
  "status": import_zod.z.union([import_zod.z.literal("failed"), import_zod.z.literal("running"), import_zod.z.literal("provisioning"), import_zod.z.literal("retired"), import_zod.z.literal("inactive")]).readonly(),
  "description": import_zod.z.string().readonly().optional(),
  "provider": import_zod.z.string().readonly().optional(),
  "context": import_zod.z.union([import_zod.z.literal("fresh"), import_zod.z.literal("fork")]).readonly().optional(),
  "diagnostics": import_zod.z.array(import_zod.z.string()).readonly(),
  "modelRouteRevision": import_zod.z.number().readonly().optional().describe("Revision of an in-place model choice; absent when still using the creation route."),
  "roleRevision": import_zod.z.number().readonly().optional().describe("Revision of the current responsibility; omitted for the creation-time role."),
  "teamFunction": import_zod.z.union([import_zod.z.literal("planning_adviser"), import_zod.z.literal("quality_adviser"), import_zod.z.literal("domain_adviser"), import_zod.z.literal("group_lead"), import_zod.z.literal("executor"), import_zod.z.literal("verifier")]).readonly().optional().describe("Team responsibility chosen by the delegating member; absent historical rows stay valid."),
  "expert": import_zod.z.object({
    "id": import_zod.z.string().readonly(),
    "revision": import_zod.z.number().readonly(),
    "name": import_zod.z.string().readonly()
  }).readonly().optional().describe("Creation-time profile identity; repeated assignment reuses this member."),
  "modelProvider": import_zod.z.string().readonly().optional().describe("Registered language-model provider, distinct from the subagent provider."),
  "model": import_zod.z.string().readonly().optional().describe("Exact model selected when the member was created."),
  "reasoningEffort": import_zod.z.string().readonly().optional().describe("Adapter-supported reasoning effort selected for this member."),
  "persona": import_zod.z.string().readonly().optional().describe("Persona persisted with the continuation and reapplied on resume.")
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_result$schema$value ??= import_zod.z.object({
  "goal": import_zod.z.object({
    "revision": import_zod.z.number().readonly(),
    "proposalRevision": import_zod.z.number().readonly(),
    "status": import_zod.z.union([import_zod.z.literal("active"), import_zod.z.literal("revoked")]).readonly(),
    "definition": import_zod.z.object({
      "objective": import_zod.z.string().readonly(),
      "acceptanceCriteria": import_zod.z.array(import_zod.z.string()).readonly(),
      "scope": import_zod.z.object({
        "coverage": import_zod.z.union([import_zod.z.literal("full"), import_zod.z.literal("partial"), import_zod.z.literal("task")]).readonly(),
        "targets": import_zod.z.array(import_zod.z.string()).readonly(),
        "allowedActions": import_zod.z.array(import_zod.z.string()).readonly(),
        "excludedTargets": import_zod.z.array(import_zod.z.string()).readonly(),
        "constraints": import_zod.z.array(import_zod.z.string()).readonly(),
        "execution": import_zod.z.object({
          "readPaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "writePaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "webOrigins": import_zod.z.array(import_zod.z.string()).readonly(),
          "allowSearch": import_zod.z.boolean().readonly(),
          "allowUnrestrictedExecution": import_zod.z.boolean().readonly().describe("Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply.")
        }).readonly().optional().describe("Absent in legacy goals; ordinary scope text never substitutes for these resource checks.")
      }).readonly(),
      "plan": import_zod.z.string().readonly().optional().describe("Complete member, model, task, dependency, and delivery plan reviewed with this goal.")
    }).readonly(),
    "decidedAt": import_zod.z.number().readonly(),
    "revocationReason": import_zod.z.string().readonly().optional()
  }).readonly().optional(),
  "goalProposal": import_zod.z.object({
    "revision": import_zod.z.number().readonly(),
    "baseRevision": import_zod.z.number().readonly(),
    "proposedBy": import_zod.z.string().readonly(),
    "change": import_zod.z.union([import_zod.z.object({
      "kind": import_zod.z.literal("replace").readonly(),
      "definition": import_zod.z.object({
        "objective": import_zod.z.string().readonly(),
        "acceptanceCriteria": import_zod.z.array(import_zod.z.string()).readonly(),
        "scope": import_zod.z.object({
          "coverage": import_zod.z.union([import_zod.z.literal("full"), import_zod.z.literal("partial"), import_zod.z.literal("task")]).readonly(),
          "targets": import_zod.z.array(import_zod.z.string()).readonly(),
          "allowedActions": import_zod.z.array(import_zod.z.string()).readonly(),
          "excludedTargets": import_zod.z.array(import_zod.z.string()).readonly(),
          "constraints": import_zod.z.array(import_zod.z.string()).readonly(),
          "execution": import_zod.z.object({
            "readPaths": import_zod.z.array(import_zod.z.string()).readonly(),
            "writePaths": import_zod.z.array(import_zod.z.string()).readonly(),
            "webOrigins": import_zod.z.array(import_zod.z.string()).readonly(),
            "allowSearch": import_zod.z.boolean().readonly(),
            "allowUnrestrictedExecution": import_zod.z.boolean().readonly().describe("Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply.")
          }).readonly().optional().describe("Absent in legacy goals; ordinary scope text never substitutes for these resource checks.")
        }).readonly(),
        "plan": import_zod.z.string().readonly().optional().describe("Complete member, model, task, dependency, and delivery plan reviewed with this goal.")
      }).readonly()
    }), import_zod.z.object({
      "kind": import_zod.z.literal("revoke").readonly(),
      "reason": import_zod.z.string().readonly()
    })]).readonly()
  }).readonly().optional(),
  "goalDecision": import_zod.z.object({
    "proposalRevision": import_zod.z.number().readonly(),
    "outcome": import_zod.z.union([import_zod.z.literal("accepted"), import_zod.z.literal("rejected")]).readonly(),
    "comment": import_zod.z.string().readonly(),
    "decidedAt": import_zod.z.number().readonly(),
    "channel": import_zod.z.literal("user-question").readonly()
  }).readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_1$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_result$schema$value ??= import_zod.z.object({
  "notBefore": import_zod.z.number().readonly().optional().describe("Earliest host-scheduled delivery time; survives restart without model polling."),
  "cooldownProvider": import_zod.z.string().readonly().optional().describe("Connection whose cooldown caused this deadline; an explicit connection change releases it."),
  "id": import_zod.z.string().readonly(),
  "taskDispatch": import_zod.z.object({
    "taskId": import_zod.z.string().readonly(),
    "executionId": import_zod.z.string().readonly(),
    "kind": import_zod.z.union([import_zod.z.literal("review"), import_zod.z.literal("execute"), import_zod.z.literal("advice")]).readonly(),
    "adviserRoleRevision": import_zod.z.number().readonly().optional()
  }).readonly().optional().describe("Automatic task notification; delivery stops if its assigned execution changes."),
  "goalRevision": import_zod.z.number().readonly().optional().describe("Confirmed goal at admission; absent legacy values are historical and never auto-dispatched."),
  "adoptedFrom": import_zod.z.string().readonly().optional().describe("Historical message explicitly adopted by the Lead under this goal."),
  "senderId": import_zod.z.string().readonly(),
  "senderName": import_zod.z.string().readonly(),
  "targetId": import_zod.z.string().readonly(),
  "content": import_zod.z.array(import_zod.z.union([import_zod.z.object({
    "type": import_zod.z.literal("text"),
    "text": import_zod.z.string()
  }), import_zod.z.object({
    "type": import_zod.z.literal("file"),
    "attachment": import_zod.z.object({
      "attachmentId": import_zod.z.string().describe("Opaque content-addressed storage identifier; never a filesystem path or bearer URL."),
      "name": import_zod.z.string().describe("Sanitized display filename, also the stored object's leaf name."),
      "bytes": import_zod.z.number().describe("Exact byte length.")
    }).describe("Immutable verbatim bytes and display metadata owned by the attachment service.")
  }), import_zod.z.object({
    "type": import_zod.z.literal("image"),
    "attachment": import_zod.z.object({
      "attachmentId": import_zod.z.string().describe("Opaque storage identifier; never a filesystem path or bearer URL."),
      "mediaType": import_zod.z.union([import_zod.z.literal("image/png"), import_zod.z.literal("image/jpeg"), import_zod.z.literal("image/webp"), import_zod.z.literal("image/gif")]).describe("Media type verified from the stored bytes."),
      "bytes": import_zod.z.number().describe("Exact encoded byte length."),
      "width": import_zod.z.number().describe("Intrinsic encoded width in pixels."),
      "height": import_zod.z.number().describe("Intrinsic encoded height in pixels."),
      "name": import_zod.z.string().optional().describe("Optional display name stripped of local path information."),
      "originalDimensions": import_zod.z.object({
        "width": import_zod.z.number(),
        "height": import_zod.z.number()
      }).optional().describe("Input dimensions after applying EXIF orientation and before normalization scaling. Present only when normalization reduced the image.")
    }).describe("Immutable bytes and intrinsic display metadata owned by the attachment service."),
    "offloaded": import_zod.z.literal(true).optional().describe("Derived from a durable image-offload decision or preserved by a message rewrite. Every route sends placeholder text naming the image and its available read-only path instead of image bytes.")
  }), import_zod.z.object({
    "type": import_zod.z.literal("reasoning"),
    "text": import_zod.z.string()
  }), import_zod.z.object({
    "type": import_zod.z.literal("tool-call"),
    "id": import_zod.z.string().describe("Provider-issued call id; correlates with the matching tool result."),
    "name": import_zod.z.string(),
    "arguments": import_zod.z.string().describe("Raw JSON string as produced by the model.")
  }), import_zod.z.object({
    "type": import_zod.z.literal("tool-addition"),
    "toolName": import_zod.z.string().describe("Name of exactly one tool in the referenced historical header."),
    "tool": import_zod.z.never().optional().describe("Reserved against inline definitions; the historical request header owns the schema.")
  }), import_zod.z.object({
    "type": import_zod.z.literal("tool-removal"),
    "toolName": import_zod.z.string()
  })])).readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_1$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_result$schema$value ??= import_zod.z.union([import_zod.z.literal(null), import_zod.z.object({
  "cwd": import_zod.z.string().readonly(),
  "baselineManifestPath": import_zod.z.string().readonly(),
  "maxMode": import_zod.z.union([import_zod.z.literal("read-only"), import_zod.z.literal("workspace-write")]).readonly()
})]);
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_1$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_result$schema$value ??= import_zod.z.object({
  "paths": import_zod.z.array(import_zod.z.string())
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_1$schema$value ??= import_zod.z.number();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_2$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_2$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_2$schema$value ??= import_zod.z.number();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_result$schema$value ??= import_zod.z.object({
  "total": import_zod.z.number().readonly(),
  "items": import_zod.z.array(import_zod.z.object({
    "id": import_zod.z.string().readonly(),
    "senderId": import_zod.z.string().readonly(),
    "senderName": import_zod.z.string().readonly(),
    "targetId": import_zod.z.string().readonly(),
    "goalRevision": import_zod.z.number().readonly().optional(),
    "adoptedFrom": import_zod.z.string().readonly().optional(),
    "status": import_zod.z.union([import_zod.z.literal("pending"), import_zod.z.literal("quarantined"), import_zod.z.literal("delivered"), import_zod.z.literal("retry-exhausted")]).readonly(),
    "attempts": import_zod.z.number().readonly(),
    "error": import_zod.z.string().readonly().optional(),
    "nextAttemptAt": import_zod.z.number().readonly().optional()
  })).readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_result$schema$value ??= import_zod.z.array(import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "senderId": import_zod.z.string().readonly(),
  "senderName": import_zod.z.string().readonly(),
  "targetId": import_zod.z.string().readonly(),
  "goalRevision": import_zod.z.number().readonly().optional(),
  "adoptedFrom": import_zod.z.string().readonly().optional(),
  "status": import_zod.z.union([import_zod.z.literal("pending"), import_zod.z.literal("quarantined"), import_zod.z.literal("delivered"), import_zod.z.literal("retry-exhausted")]).readonly(),
  "attempts": import_zod.z.number().readonly(),
  "error": import_zod.z.string().readonly().optional(),
  "nextAttemptAt": import_zod.z.number().readonly().optional()
}));
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_1$schema$value ??= import_zod.z.object({
  "after": import_zod.z.string().readonly().optional().describe("Exclusive cursor from the preceding archive page."),
  "limit": import_zod.z.number().readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_result$schema$value ??= import_zod.z.object({
  "tasks": import_zod.z.array(import_zod.z.object({
    "dispatchBlocker": import_zod.z.union([import_zod.z.literal("goal"), import_zod.z.literal("dependencies"), import_zod.z.literal("reviewer_missing"), import_zod.z.literal("adviser_review"), import_zod.z.literal("skills"), import_zod.z.literal("manual")]).readonly().optional(),
    "work": import_zod.z.object({
      "plan": import_zod.z.object({
        "inputPaths": import_zod.z.array(import_zod.z.string()).readonly().optional(),
        "adviserGate": import_zod.z.literal("dual").readonly().optional(),
        "revision": import_zod.z.number().readonly(),
        "plannerId": import_zod.z.string().readonly(),
        "goalRevision": import_zod.z.number().readonly().describe("Zero denotes a Team that has no confirmed goal yet."),
        "inputs": import_zod.z.array(import_zod.z.object({
          "path": import_zod.z.string().readonly().describe("Logical project-relative output path."),
          "bytes": import_zod.z.number().readonly().describe("Host-observed byte length."),
          "sha256": import_zod.z.string().readonly().describe("Lowercase hexadecimal digest of the complete file bytes.")
        })).readonly().optional().describe("Host-observed inputs; absent on legacy plans."),
        "environment": import_zod.z.object({
          "workspaceRoot": import_zod.z.string().readonly(),
          "platform": import_zod.z.string().readonly(),
          "arch": import_zod.z.string().readonly(),
          "nodeVersion": import_zod.z.string().readonly()
        }).readonly().optional().describe("Host-observed local runtime; absent on legacy plans."),
        "inputVersion": import_zod.z.string().readonly().describe("Version of the supplied inputs; this declaration alone does not inspect files."),
        "environmentVersion": import_zod.z.string().readonly().describe("Version of the relevant tools, devices, and runtime conditions."),
        "acceptanceCriteria": import_zod.z.array(import_zod.z.string()).readonly()
      }).readonly(),
      "attempts": import_zod.z.number().readonly(),
      "execution": import_zod.z.object({
        "id": import_zod.z.string().readonly(),
        "ownerId": import_zod.z.string().readonly(),
        "planRevision": import_zod.z.number().readonly(),
        "dependencies": import_zod.z.array(import_zod.z.object({
          "taskId": import_zod.z.string().readonly(),
          "revision": import_zod.z.number().readonly()
        })).readonly(),
        "phase": import_zod.z.union([import_zod.z.literal("cancelled"), import_zod.z.literal("running"), import_zod.z.literal("submitted"), import_zod.z.literal("accepted"), import_zod.z.literal("rejected")]).readonly(),
        "effectTracking": import_zod.z.literal("observed").readonly().optional().describe("Absent on attempts created before tool dispatch tracking was installed."),
        "effectReview": import_zod.z.object({
          "reviewerId": import_zod.z.string().readonly(),
          "resolution": import_zod.z.union([import_zod.z.literal("none"), import_zod.z.literal("known")]).readonly(),
          "summary": import_zod.z.string().readonly(),
          "evidence": import_zod.z.array(import_zod.z.string()).readonly(),
          "observedCalls": import_zod.z.number().readonly()
        }).readonly().optional(),
        "submission": import_zod.z.object({
          "result": import_zod.z.string().readonly(),
          "evidence": import_zod.z.array(import_zod.z.string()).readonly(),
          "artifacts": import_zod.z.array(import_zod.z.object({
            "path": import_zod.z.string().readonly().describe("Logical project-relative output path."),
            "bytes": import_zod.z.number().readonly().describe("Host-observed byte length."),
            "sha256": import_zod.z.string().readonly().describe("Lowercase hexadecimal digest of the complete file bytes.")
          })).readonly().optional().describe("Host-observed output files; absent on legacy submissions."),
          "environment": import_zod.z.object({
            "workspaceRoot": import_zod.z.string().readonly(),
            "platform": import_zod.z.string().readonly(),
            "arch": import_zod.z.string().readonly(),
            "nodeVersion": import_zod.z.string().readonly()
          }).readonly().optional().describe("Host-observed executor workspace and runtime for the artifact receipts."),
          "sideEffects": import_zod.z.union([import_zod.z.literal("unknown"), import_zod.z.literal("none"), import_zod.z.literal("known")]).readonly().optional().describe("Caller declaration, never by itself proof that no external side effect occurred."),
          "sideEffectEvidence": import_zod.z.array(import_zod.z.string()).readonly().optional()
        }).readonly().optional(),
        "review": import_zod.z.object({
          "reviewerId": import_zod.z.string().readonly(),
          "decision": import_zod.z.union([import_zod.z.literal("accepted"), import_zod.z.literal("rejected")]).readonly(),
          "summary": import_zod.z.string().readonly(),
          "evidence": import_zod.z.array(import_zod.z.string()).readonly()
        }).readonly().optional()
      }).readonly().optional()
    }).readonly().optional(),
    "validity": import_zod.z.object({
      "reusable": import_zod.z.boolean().readonly(),
      "reasons": import_zod.z.array(import_zod.z.string()).readonly()
    }).readonly(),
    "recovery": import_zod.z.object({
      "reason": import_zod.z.literal("owner_inactive").readonly(),
      "action": import_zod.z.union([import_zod.z.literal("resume"), import_zod.z.literal("reconcile"), import_zod.z.literal("review"), import_zod.z.literal("inspect")]).readonly()
    }).readonly().optional().describe("Runtime-only next step when an inactive owner leaves a task in progress."),
    "id": import_zod.z.string().readonly(),
    "revision": import_zod.z.number().readonly(),
    "subject": import_zod.z.string().readonly(),
    "description": import_zod.z.string().readonly(),
    "status": import_zod.z.union([import_zod.z.literal("completed"), import_zod.z.literal("pending"), import_zod.z.literal("in_progress"), import_zod.z.literal("deleted")]).readonly(),
    "blockedBy": import_zod.z.array(import_zod.z.string()).readonly(),
    "writeScopes": import_zod.z.array(import_zod.z.string()).readonly(),
    "ownerName": import_zod.z.string().readonly().optional(),
    "reviewerName": import_zod.z.string().readonly().optional(),
    "requiredSkill": import_zod.z.string().readonly().optional(),
    "autoAssign": import_zod.z.boolean().readonly().optional(),
    "ready": import_zod.z.boolean().readonly(),
    "writeScopeWarnings": import_zod.z.array(import_zod.z.string()).readonly(),
    "inputKey": import_zod.z.string().readonly().optional().describe("Caller-supplied input version, or a configured hash of the original task inputs."),
    "result": import_zod.z.string().readonly().optional().describe("Reusable completion summary."),
    "evidence": import_zod.z.array(import_zod.z.string()).readonly().optional().describe("Artifact paths, source URLs, or executed verification facts supporting the result.")
  })).readonly(),
  "nextCursor": import_zod.z.string().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_1$schema$value ??= import_zod.z.object({
  "expectedProposalRevision": import_zod.z.number().readonly(),
  "expectedGoalRevision": import_zod.z.number().readonly(),
  "change": import_zod.z.union([import_zod.z.object({
    "kind": import_zod.z.literal("replace").readonly(),
    "definition": import_zod.z.object({
      "objective": import_zod.z.string().readonly(),
      "acceptanceCriteria": import_zod.z.array(import_zod.z.string()).readonly(),
      "scope": import_zod.z.object({
        "coverage": import_zod.z.union([import_zod.z.literal("full"), import_zod.z.literal("partial"), import_zod.z.literal("task")]).readonly(),
        "targets": import_zod.z.array(import_zod.z.string()).readonly(),
        "allowedActions": import_zod.z.array(import_zod.z.string()).readonly(),
        "excludedTargets": import_zod.z.array(import_zod.z.string()).readonly(),
        "constraints": import_zod.z.array(import_zod.z.string()).readonly(),
        "execution": import_zod.z.object({
          "readPaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "writePaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "webOrigins": import_zod.z.array(import_zod.z.string()).readonly(),
          "allowSearch": import_zod.z.boolean().readonly(),
          "allowUnrestrictedExecution": import_zod.z.boolean().readonly().describe("Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply.")
        }).readonly().optional().describe("Absent in legacy goals; ordinary scope text never substitutes for these resource checks.")
      }).readonly(),
      "plan": import_zod.z.string().readonly().optional().describe("Complete member, model, task, dependency, and delivery plan reviewed with this goal.")
    }).readonly()
  }), import_zod.z.object({
    "kind": import_zod.z.literal("revoke").readonly(),
    "reason": import_zod.z.string().readonly()
  })]).readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_result$schema$value ??= import_zod.z.object({
  "revision": import_zod.z.number().readonly(),
  "baseRevision": import_zod.z.number().readonly(),
  "proposedBy": import_zod.z.string().readonly(),
  "change": import_zod.z.union([import_zod.z.object({
    "kind": import_zod.z.literal("replace").readonly(),
    "definition": import_zod.z.object({
      "objective": import_zod.z.string().readonly(),
      "acceptanceCriteria": import_zod.z.array(import_zod.z.string()).readonly(),
      "scope": import_zod.z.object({
        "coverage": import_zod.z.union([import_zod.z.literal("full"), import_zod.z.literal("partial"), import_zod.z.literal("task")]).readonly(),
        "targets": import_zod.z.array(import_zod.z.string()).readonly(),
        "allowedActions": import_zod.z.array(import_zod.z.string()).readonly(),
        "excludedTargets": import_zod.z.array(import_zod.z.string()).readonly(),
        "constraints": import_zod.z.array(import_zod.z.string()).readonly(),
        "execution": import_zod.z.object({
          "readPaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "writePaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "webOrigins": import_zod.z.array(import_zod.z.string()).readonly(),
          "allowSearch": import_zod.z.boolean().readonly(),
          "allowUnrestrictedExecution": import_zod.z.boolean().readonly().describe("Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply.")
        }).readonly().optional().describe("Absent in legacy goals; ordinary scope text never substitutes for these resource checks.")
      }).readonly(),
      "plan": import_zod.z.string().readonly().optional().describe("Complete member, model, task, dependency, and delivery plan reviewed with this goal.")
    }).readonly()
  }), import_zod.z.object({
    "kind": import_zod.z.literal("revoke").readonly(),
    "reason": import_zod.z.string().readonly()
  })]).readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_1$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "parentId": import_zod.z.string().readonly().optional(),
  "parentName": import_zod.z.string().readonly().optional(),
  "name": import_zod.z.string().readonly(),
  "role": import_zod.z.union([import_zod.z.literal("lead"), import_zod.z.literal("teammate")]).readonly(),
  "status": import_zod.z.union([import_zod.z.literal("failed"), import_zod.z.literal("running"), import_zod.z.literal("provisioning"), import_zod.z.literal("retired"), import_zod.z.literal("inactive")]).readonly(),
  "description": import_zod.z.string().readonly().optional(),
  "provider": import_zod.z.string().readonly().optional(),
  "context": import_zod.z.union([import_zod.z.literal("fresh"), import_zod.z.literal("fork")]).readonly().optional(),
  "diagnostics": import_zod.z.array(import_zod.z.string()).readonly(),
  "modelRouteRevision": import_zod.z.number().readonly().optional().describe("Revision of an in-place model choice; absent when still using the creation route."),
  "roleRevision": import_zod.z.number().readonly().optional().describe("Revision of the current responsibility; omitted for the creation-time role."),
  "teamFunction": import_zod.z.union([import_zod.z.literal("planning_adviser"), import_zod.z.literal("quality_adviser"), import_zod.z.literal("domain_adviser"), import_zod.z.literal("group_lead"), import_zod.z.literal("executor"), import_zod.z.literal("verifier")]).readonly().optional().describe("Team responsibility chosen by the delegating member; absent historical rows stay valid."),
  "expert": import_zod.z.object({
    "id": import_zod.z.string().readonly(),
    "revision": import_zod.z.number().readonly(),
    "name": import_zod.z.string().readonly()
  }).readonly().optional().describe("Creation-time profile identity; repeated assignment reuses this member."),
  "modelProvider": import_zod.z.string().readonly().optional().describe("Registered language-model provider, distinct from the subagent provider."),
  "model": import_zod.z.string().readonly().optional().describe("Exact model selected when the member was created."),
  "reasoningEffort": import_zod.z.string().readonly().optional().describe("Adapter-supported reasoning effort selected for this member."),
  "persona": import_zod.z.string().readonly().optional().describe("Persona persisted with the continuation and reapplied on resume.")
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_1$schema$value ??= import_zod.z.object({
  "taskId": import_zod.z.string().readonly(),
  "executionId": import_zod.z.string().readonly(),
  "path": import_zod.z.string().readonly(),
  "byteOffset": import_zod.z.number().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_result$schema$value ??= import_zod.z.object({
  "taskId": import_zod.z.string().readonly(),
  "executionId": import_zod.z.string().readonly(),
  "path": import_zod.z.string().readonly(),
  "sha256": import_zod.z.string().readonly(),
  "totalBytes": import_zod.z.number().readonly(),
  "byteOffset": import_zod.z.number().readonly(),
  "content": import_zod.z.string().readonly(),
  "nextByteOffset": import_zod.z.number().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_1$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "parentId": import_zod.z.string().readonly().optional(),
  "parentName": import_zod.z.string().readonly().optional(),
  "name": import_zod.z.string().readonly(),
  "role": import_zod.z.union([import_zod.z.literal("lead"), import_zod.z.literal("teammate")]).readonly(),
  "status": import_zod.z.union([import_zod.z.literal("failed"), import_zod.z.literal("running"), import_zod.z.literal("provisioning"), import_zod.z.literal("retired"), import_zod.z.literal("inactive")]).readonly(),
  "description": import_zod.z.string().readonly().optional(),
  "provider": import_zod.z.string().readonly().optional(),
  "context": import_zod.z.union([import_zod.z.literal("fresh"), import_zod.z.literal("fork")]).readonly().optional(),
  "diagnostics": import_zod.z.array(import_zod.z.string()).readonly(),
  "modelRouteRevision": import_zod.z.number().readonly().optional().describe("Revision of an in-place model choice; absent when still using the creation route."),
  "roleRevision": import_zod.z.number().readonly().optional().describe("Revision of the current responsibility; omitted for the creation-time role."),
  "teamFunction": import_zod.z.union([import_zod.z.literal("planning_adviser"), import_zod.z.literal("quality_adviser"), import_zod.z.literal("domain_adviser"), import_zod.z.literal("group_lead"), import_zod.z.literal("executor"), import_zod.z.literal("verifier")]).readonly().optional().describe("Team responsibility chosen by the delegating member; absent historical rows stay valid."),
  "expert": import_zod.z.object({
    "id": import_zod.z.string().readonly(),
    "revision": import_zod.z.number().readonly(),
    "name": import_zod.z.string().readonly()
  }).readonly().optional().describe("Creation-time profile identity; repeated assignment reuses this member."),
  "modelProvider": import_zod.z.string().readonly().optional().describe("Registered language-model provider, distinct from the subagent provider."),
  "model": import_zod.z.string().readonly().optional().describe("Exact model selected when the member was created."),
  "reasoningEffort": import_zod.z.string().readonly().optional().describe("Adapter-supported reasoning effort selected for this member."),
  "persona": import_zod.z.string().readonly().optional().describe("Persona persisted with the continuation and reapplied on resume.")
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_1$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_result$schema$value ??= import_zod.z.object({
  "messageId": import_zod.z.string().readonly(),
  "status": import_zod.z.union([import_zod.z.literal("accepted"), import_zod.z.literal("queued")]).readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_1$schema$value ??= import_zod.z.number();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_result$schema$value ??= import_zod.z.object({
  "goal": import_zod.z.object({
    "revision": import_zod.z.number().readonly(),
    "proposalRevision": import_zod.z.number().readonly(),
    "status": import_zod.z.union([import_zod.z.literal("active"), import_zod.z.literal("revoked")]).readonly(),
    "definition": import_zod.z.object({
      "objective": import_zod.z.string().readonly(),
      "acceptanceCriteria": import_zod.z.array(import_zod.z.string()).readonly(),
      "scope": import_zod.z.object({
        "coverage": import_zod.z.union([import_zod.z.literal("full"), import_zod.z.literal("partial"), import_zod.z.literal("task")]).readonly(),
        "targets": import_zod.z.array(import_zod.z.string()).readonly(),
        "allowedActions": import_zod.z.array(import_zod.z.string()).readonly(),
        "excludedTargets": import_zod.z.array(import_zod.z.string()).readonly(),
        "constraints": import_zod.z.array(import_zod.z.string()).readonly(),
        "execution": import_zod.z.object({
          "readPaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "writePaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "webOrigins": import_zod.z.array(import_zod.z.string()).readonly(),
          "allowSearch": import_zod.z.boolean().readonly(),
          "allowUnrestrictedExecution": import_zod.z.boolean().readonly().describe("Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply.")
        }).readonly().optional().describe("Absent in legacy goals; ordinary scope text never substitutes for these resource checks.")
      }).readonly(),
      "plan": import_zod.z.string().readonly().optional().describe("Complete member, model, task, dependency, and delivery plan reviewed with this goal.")
    }).readonly(),
    "decidedAt": import_zod.z.number().readonly(),
    "revocationReason": import_zod.z.string().readonly().optional()
  }).readonly().optional(),
  "goalProposal": import_zod.z.object({
    "revision": import_zod.z.number().readonly(),
    "baseRevision": import_zod.z.number().readonly(),
    "proposedBy": import_zod.z.string().readonly(),
    "change": import_zod.z.union([import_zod.z.object({
      "kind": import_zod.z.literal("replace").readonly(),
      "definition": import_zod.z.object({
        "objective": import_zod.z.string().readonly(),
        "acceptanceCriteria": import_zod.z.array(import_zod.z.string()).readonly(),
        "scope": import_zod.z.object({
          "coverage": import_zod.z.union([import_zod.z.literal("full"), import_zod.z.literal("partial"), import_zod.z.literal("task")]).readonly(),
          "targets": import_zod.z.array(import_zod.z.string()).readonly(),
          "allowedActions": import_zod.z.array(import_zod.z.string()).readonly(),
          "excludedTargets": import_zod.z.array(import_zod.z.string()).readonly(),
          "constraints": import_zod.z.array(import_zod.z.string()).readonly(),
          "execution": import_zod.z.object({
            "readPaths": import_zod.z.array(import_zod.z.string()).readonly(),
            "writePaths": import_zod.z.array(import_zod.z.string()).readonly(),
            "webOrigins": import_zod.z.array(import_zod.z.string()).readonly(),
            "allowSearch": import_zod.z.boolean().readonly(),
            "allowUnrestrictedExecution": import_zod.z.boolean().readonly().describe("Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply.")
          }).readonly().optional().describe("Absent in legacy goals; ordinary scope text never substitutes for these resource checks.")
        }).readonly(),
        "plan": import_zod.z.string().readonly().optional().describe("Complete member, model, task, dependency, and delivery plan reviewed with this goal.")
      }).readonly()
    }), import_zod.z.object({
      "kind": import_zod.z.literal("revoke").readonly(),
      "reason": import_zod.z.string().readonly()
    })]).readonly()
  }).readonly().optional(),
  "goalDecision": import_zod.z.object({
    "proposalRevision": import_zod.z.number().readonly(),
    "outcome": import_zod.z.union([import_zod.z.literal("accepted"), import_zod.z.literal("rejected")]).readonly(),
    "comment": import_zod.z.string().readonly(),
    "decidedAt": import_zod.z.number().readonly(),
    "channel": import_zod.z.literal("user-question").readonly()
  }).readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_1$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_result$schema$value ??= import_zod.z.object({
  "taskId": import_zod.z.string().readonly(),
  "revision": import_zod.z.number().readonly(),
  "checkedAt": import_zod.z.number().readonly(),
  "validity": import_zod.z.object({
    "reusable": import_zod.z.boolean().readonly(),
    "reasons": import_zod.z.array(import_zod.z.string()).readonly()
  }).readonly(),
  "inputs": import_zod.z.array(import_zod.z.object({
    "path": import_zod.z.string().readonly().describe("Logical project-relative output path."),
    "bytes": import_zod.z.number().readonly().describe("Host-observed byte length."),
    "sha256": import_zod.z.string().readonly().describe("Lowercase hexadecimal digest of the complete file bytes.")
  })).readonly(),
  "artifacts": import_zod.z.array(import_zod.z.object({
    "path": import_zod.z.string().readonly().describe("Logical project-relative output path."),
    "bytes": import_zod.z.number().readonly().describe("Host-observed byte length."),
    "sha256": import_zod.z.string().readonly().describe("Lowercase hexadecimal digest of the complete file bytes.")
  })).readonly(),
  "environment": import_zod.z.object({
    "workspaceRoot": import_zod.z.string().readonly(),
    "platform": import_zod.z.string().readonly(),
    "arch": import_zod.z.string().readonly(),
    "nodeVersion": import_zod.z.string().readonly()
  }).readonly().optional(),
  "artifactEnvironment": import_zod.z.object({
    "workspaceRoot": import_zod.z.string().readonly(),
    "platform": import_zod.z.string().readonly(),
    "arch": import_zod.z.string().readonly(),
    "nodeVersion": import_zod.z.string().readonly()
  }).readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_parameter_0$schema$value ??= import_zod.z.object({
  "name": import_zod.z.string().readonly(),
  "description": import_zod.z.string().readonly(),
  "persona": import_zod.z.string().readonly(),
  "instructions": import_zod.z.string().readonly().describe("AGENT.md text copied into the continuable member's logged persona."),
  "skills": import_zod.z.array(import_zod.z.string()).readonly().describe("Available skill names to consult; these references do not install skills."),
  "modelProvider": import_zod.z.string().readonly().optional().describe("Omit provider and model together to inherit the assigning parent's route."),
  "model": import_zod.z.string().readonly().optional(),
  "reasoningEffort": import_zod.z.string().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "definition": import_zod.z.object({
    "name": import_zod.z.string().readonly(),
    "description": import_zod.z.string().readonly(),
    "persona": import_zod.z.string().readonly(),
    "instructions": import_zod.z.string().readonly().describe("AGENT.md text copied into the continuable member's logged persona."),
    "skills": import_zod.z.array(import_zod.z.string()).readonly().describe("Available skill names to consult; these references do not install skills."),
    "modelProvider": import_zod.z.string().readonly().optional().describe("Omit provider and model together to inherit the assigning parent's route."),
    "model": import_zod.z.string().readonly().optional(),
    "reasoningEffort": import_zod.z.string().readonly().optional()
  }).readonly(),
  "revision": import_zod.z.number().readonly(),
  "createdAt": import_zod.z.number().readonly(),
  "updatedAt": import_zod.z.number().readonly(),
  "archived": import_zod.z.boolean().readonly(),
  "ownerTeamId": import_zod.z.string().readonly().optional().describe("Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template."),
  "ownerMemberId": import_zod.z.string().readonly().optional().describe("Member that authored this Team-local profile.")
});
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "definition": import_zod.z.object({
    "name": import_zod.z.string().readonly(),
    "description": import_zod.z.string().readonly(),
    "persona": import_zod.z.string().readonly(),
    "instructions": import_zod.z.string().readonly().describe("AGENT.md text copied into the continuable member's logged persona."),
    "skills": import_zod.z.array(import_zod.z.string()).readonly().describe("Available skill names to consult; these references do not install skills."),
    "modelProvider": import_zod.z.string().readonly().optional().describe("Omit provider and model together to inherit the assigning parent's route."),
    "model": import_zod.z.string().readonly().optional(),
    "reasoningEffort": import_zod.z.string().readonly().optional()
  }).readonly(),
  "revision": import_zod.z.number().readonly(),
  "createdAt": import_zod.z.number().readonly(),
  "updatedAt": import_zod.z.number().readonly(),
  "archived": import_zod.z.boolean().readonly(),
  "ownerTeamId": import_zod.z.string().readonly().optional().describe("Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template."),
  "ownerMemberId": import_zod.z.string().readonly().optional().describe("Member that authored this Team-local profile.")
});
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_parameter_0$schema$value ??= import_zod.z.boolean();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_result$schema$value ??= import_zod.z.array(import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "definition": import_zod.z.object({
    "name": import_zod.z.string().readonly(),
    "description": import_zod.z.string().readonly(),
    "persona": import_zod.z.string().readonly(),
    "instructions": import_zod.z.string().readonly().describe("AGENT.md text copied into the continuable member's logged persona."),
    "skills": import_zod.z.array(import_zod.z.string()).readonly().describe("Available skill names to consult; these references do not install skills."),
    "modelProvider": import_zod.z.string().readonly().optional().describe("Omit provider and model together to inherit the assigning parent's route."),
    "model": import_zod.z.string().readonly().optional(),
    "reasoningEffort": import_zod.z.string().readonly().optional()
  }).readonly(),
  "revision": import_zod.z.number().readonly(),
  "createdAt": import_zod.z.number().readonly(),
  "updatedAt": import_zod.z.number().readonly(),
  "archived": import_zod.z.boolean().readonly(),
  "ownerTeamId": import_zod.z.string().readonly().optional().describe("Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template."),
  "ownerMemberId": import_zod.z.string().readonly().optional().describe("Member that authored this Team-local profile.")
}));
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_0$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_0$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_0$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_1$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_1$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_1$schema$value ??= import_zod.z.number();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_2$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_2$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_2$schema$value ??= import_zod.z.object({
  "name": import_zod.z.string().readonly(),
  "description": import_zod.z.string().readonly(),
  "persona": import_zod.z.string().readonly(),
  "instructions": import_zod.z.string().readonly().describe("AGENT.md text copied into the continuable member's logged persona."),
  "skills": import_zod.z.array(import_zod.z.string()).readonly().describe("Available skill names to consult; these references do not install skills."),
  "modelProvider": import_zod.z.string().readonly().optional().describe("Omit provider and model together to inherit the assigning parent's route."),
  "model": import_zod.z.string().readonly().optional(),
  "reasoningEffort": import_zod.z.string().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_3$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_3$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_3$schema$value ??= import_zod.z.boolean();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_result$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_result$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_result$schema$value ??= import_zod.z.object({
  "id": import_zod.z.string().readonly(),
  "definition": import_zod.z.object({
    "name": import_zod.z.string().readonly(),
    "description": import_zod.z.string().readonly(),
    "persona": import_zod.z.string().readonly(),
    "instructions": import_zod.z.string().readonly().describe("AGENT.md text copied into the continuable member's logged persona."),
    "skills": import_zod.z.array(import_zod.z.string()).readonly().describe("Available skill names to consult; these references do not install skills."),
    "modelProvider": import_zod.z.string().readonly().optional().describe("Omit provider and model together to inherit the assigning parent's route."),
    "model": import_zod.z.string().readonly().optional(),
    "reasoningEffort": import_zod.z.string().readonly().optional()
  }).readonly(),
  "revision": import_zod.z.number().readonly(),
  "createdAt": import_zod.z.number().readonly(),
  "updatedAt": import_zod.z.number().readonly(),
  "archived": import_zod.z.boolean().readonly(),
  "ownerTeamId": import_zod.z.string().readonly().optional().describe("Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template."),
  "ownerMemberId": import_zod.z.string().readonly().optional().describe("Member that authored this Team-local profile.")
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_1_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_1_strict$schema$value ??= import_zod.z.strictObject({
  "expectedRevision": import_zod.z.number().readonly().optional().describe("Optional route revision from listMembers; concurrent conflicting changes are rejected."),
  "target": import_zod.z.string().readonly(),
  "modelProvider": import_zod.z.string().readonly(),
  "model": import_zod.z.string().readonly(),
  "reasoningEffort": import_zod.z.string().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_1_strict$schema$value ??= import_zod.z.strictObject({
  "target": import_zod.z.string().readonly(),
  "expectedRevision": import_zod.z.number().readonly(),
  "teamFunction": import_zod.z.union([import_zod.z.literal("planning_adviser"), import_zod.z.literal("quality_adviser"), import_zod.z.literal("domain_adviser"), import_zod.z.literal("group_lead"), import_zod.z.literal("executor"), import_zod.z.literal("verifier")]).readonly(),
  "reason": import_zod.z.string().readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_1_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_1_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_1_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_1_strict$schema$value ??= import_zod.z.number();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_2_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_2_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_2_strict$schema$value ??= import_zod.z.number();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_1_strict$schema$value ??= import_zod.z.strictObject({
  "after": import_zod.z.string().readonly().optional().describe("Exclusive cursor from the preceding archive page."),
  "limit": import_zod.z.number().readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_1_strict$schema$value ??= import_zod.z.strictObject({
  "expectedProposalRevision": import_zod.z.number().readonly(),
  "expectedGoalRevision": import_zod.z.number().readonly(),
  "change": import_zod.z.union([import_zod.z.strictObject({
    "kind": import_zod.z.literal("replace").readonly(),
    "definition": import_zod.z.strictObject({
      "objective": import_zod.z.string().readonly(),
      "acceptanceCriteria": import_zod.z.array(import_zod.z.string()).readonly(),
      "scope": import_zod.z.strictObject({
        "coverage": import_zod.z.union([import_zod.z.literal("full"), import_zod.z.literal("partial"), import_zod.z.literal("task")]).readonly(),
        "targets": import_zod.z.array(import_zod.z.string()).readonly(),
        "allowedActions": import_zod.z.array(import_zod.z.string()).readonly(),
        "excludedTargets": import_zod.z.array(import_zod.z.string()).readonly(),
        "constraints": import_zod.z.array(import_zod.z.string()).readonly(),
        "execution": import_zod.z.strictObject({
          "readPaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "writePaths": import_zod.z.array(import_zod.z.string()).readonly(),
          "webOrigins": import_zod.z.array(import_zod.z.string()).readonly(),
          "allowSearch": import_zod.z.boolean().readonly(),
          "allowUnrestrictedExecution": import_zod.z.boolean().readonly().describe("Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply.")
        }).readonly().optional().describe("Absent in legacy goals; ordinary scope text never substitutes for these resource checks.")
      }).readonly(),
      "plan": import_zod.z.string().readonly().optional().describe("Complete member, model, task, dependency, and delivery plan reviewed with this goal.")
    }).readonly()
  }), import_zod.z.strictObject({
    "kind": import_zod.z.literal("revoke").readonly(),
    "reason": import_zod.z.string().readonly()
  })]).readonly()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_1_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_1_strict$schema$value ??= import_zod.z.strictObject({
  "taskId": import_zod.z.string().readonly(),
  "executionId": import_zod.z.string().readonly(),
  "path": import_zod.z.string().readonly(),
  "byteOffset": import_zod.z.number().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_1_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_1_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_1_strict$schema$value ??= import_zod.z.number();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_1_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_parameter_0_strict$schema$value ??= import_zod.z.strictObject({
  "name": import_zod.z.string().readonly(),
  "description": import_zod.z.string().readonly(),
  "persona": import_zod.z.string().readonly(),
  "instructions": import_zod.z.string().readonly().describe("AGENT.md text copied into the continuable member's logged persona."),
  "skills": import_zod.z.array(import_zod.z.string()).readonly().describe("Available skill names to consult; these references do not install skills."),
  "modelProvider": import_zod.z.string().readonly().optional().describe("Omit provider and model together to inherit the assigning parent's route."),
  "model": import_zod.z.string().readonly().optional(),
  "reasoningEffort": import_zod.z.string().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_parameter_0_strict$schema$value ??= import_zod.z.boolean();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_0_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_0_strict$schema$value ??= import_zod.z.string();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_1_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_1_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_1_strict$schema$value ??= import_zod.z.number();
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_2_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_2_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_2_strict$schema$value ??= import_zod.z.strictObject({
  "name": import_zod.z.string().readonly(),
  "description": import_zod.z.string().readonly(),
  "persona": import_zod.z.string().readonly(),
  "instructions": import_zod.z.string().readonly().describe("AGENT.md text copied into the continuable member's logged persona."),
  "skills": import_zod.z.array(import_zod.z.string()).readonly().describe("Available skill names to consult; these references do not install skills."),
  "modelProvider": import_zod.z.string().readonly().optional().describe("Omit provider and model together to inherit the assigning parent's route."),
  "model": import_zod.z.string().readonly().optional(),
  "reasoningEffort": import_zod.z.string().readonly().optional()
});
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_3_strict$schema$value;
var _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_3_strict$schema = () => _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_3_strict$schema$value ??= import_zod.z.boolean();
var TYPERT_REMOTE = createTypertRemoteInfo({
  package: "dsh-team-workbench/runtime",
  methods: {
    "agentTeams/adoptMessage": {
      service: "agentTeams",
      description: "Requeue a historical message after the Lead explicitly adopts its contents.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Team Lead.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "messageId",
          description: "Historical source message, retained unchanged.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamMessageId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_1$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamMessageId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_parameter_1_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#SendTeamMessageResult",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_adoptMessage_result$schema,
        description: "the new message's identity and immediate delivery observation.",
        jsonSchema: { "type": "object", "properties": { "messageId": { "type": "string" }, "status": { "type": "string", "enum": ["accepted", "queued"] } }, "required": ["messageId", "status"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 908, "column": 9 }
    },
    "agentTeams/configureMemberModel": {
      service: "agentTeams",
      description: "Change an existing teammate's model for its next request while retaining its Session.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Team Lead or the target's direct parent.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "request",
          description: "Configured provider, model, and optional supported effort.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#ConfigureTeamMemberModelRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_1$schema,
            jsonSchema: { "type": "object", "properties": { "expectedRevision": { "type": "number", "description": "Optional route revision from listMembers; concurrent conflicting changes are rejected." }, "target": { "type": "string" }, "modelProvider": { "type": "string" }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["target", "modelProvider", "model"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#ConfigureTeamMemberModelRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_parameter_1_strict$schema,
            jsonSchema: { "type": "object", "properties": { "expectedRevision": { "type": "number", "description": "Optional route revision from listMembers; concurrent conflicting changes are rejected." }, "target": { "type": "string" }, "modelProvider": { "type": "string" }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["target", "modelProvider", "model"], "additionalProperties": false }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamMemberView",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberModel_result$schema,
        description: "updated member row.",
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "parentId": { "type": "string" }, "parentName": { "type": "string" }, "name": { "type": "string" }, "role": { "type": "string", "enum": ["lead", "teammate"] }, "status": { "type": "string", "enum": ["failed", "running", "provisioning", "retired", "inactive"] }, "description": { "type": "string" }, "provider": { "type": "string" }, "context": { "type": "string", "enum": ["fresh", "fork"] }, "diagnostics": { "type": "array", "items": { "type": "string" } }, "modelRouteRevision": { "type": "number", "description": "Revision of an in-place model choice; absent when still using the creation route." }, "roleRevision": { "type": "number", "description": "Revision of the current responsibility; omitted for the creation-time role." }, "teamFunction": { "type": "string", "enum": ["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"], "description": "Team responsibility chosen by the delegating member; absent historical rows stay valid." }, "expert": { "type": "object", "properties": { "id": { "type": "string" }, "revision": { "type": "number" }, "name": { "type": "string" } }, "required": ["id", "revision", "name"], "additionalProperties": true, "description": "Creation-time profile identity; repeated assignment reuses this member." }, "modelProvider": { "type": "string", "description": "Registered language-model provider, distinct from the subagent provider." }, "model": { "type": "string", "description": "Exact model selected when the member was created." }, "reasoningEffort": { "type": "string", "description": "Adapter-supported reasoning effort selected for this member." }, "persona": { "type": "string", "description": "Persona persisted with the continuation and reapplied on resume." } }, "required": ["id", "name", "role", "status", "diagnostics"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 518, "column": 9 }
    },
    "agentTeams/configureMemberRole": {
      service: "agentTeams",
      description: "Configure an inactive retained member's responsibility without replacing its Session.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact Lead or direct parent.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "request",
          description: "Responsibility and expected role revision from listMembers.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#ConfigureTeamMemberRoleRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_1$schema,
            jsonSchema: { "type": "object", "properties": { "target": { "type": "string" }, "expectedRevision": { "type": "number" }, "teamFunction": { "type": "string", "enum": ["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"] }, "reason": { "type": "string" } }, "required": ["target", "expectedRevision", "teamFunction", "reason"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#ConfigureTeamMemberRoleRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_parameter_1_strict$schema,
            jsonSchema: { "type": "object", "properties": { "target": { "type": "string" }, "expectedRevision": { "type": "number" }, "teamFunction": { "type": "string", "enum": ["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"] }, "reason": { "type": "string" } }, "required": ["target", "expectedRevision", "teamFunction", "reason"], "additionalProperties": false }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamMemberView",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_configureMemberRole_result$schema,
        description: "updated member row.",
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "parentId": { "type": "string" }, "parentName": { "type": "string" }, "name": { "type": "string" }, "role": { "type": "string", "enum": ["lead", "teammate"] }, "status": { "type": "string", "enum": ["failed", "running", "provisioning", "retired", "inactive"] }, "description": { "type": "string" }, "provider": { "type": "string" }, "context": { "type": "string", "enum": ["fresh", "fork"] }, "diagnostics": { "type": "array", "items": { "type": "string" } }, "modelRouteRevision": { "type": "number", "description": "Revision of an in-place model choice; absent when still using the creation route." }, "roleRevision": { "type": "number", "description": "Revision of the current responsibility; omitted for the creation-time role." }, "teamFunction": { "type": "string", "enum": ["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"], "description": "Team responsibility chosen by the delegating member; absent historical rows stay valid." }, "expert": { "type": "object", "properties": { "id": { "type": "string" }, "revision": { "type": "number" }, "name": { "type": "string" } }, "required": ["id", "revision", "name"], "additionalProperties": true, "description": "Creation-time profile identity; repeated assignment reuses this member." }, "modelProvider": { "type": "string", "description": "Registered language-model provider, distinct from the subagent provider." }, "model": { "type": "string", "description": "Exact model selected when the member was created." }, "reasoningEffort": { "type": "string", "description": "Adapter-supported reasoning effort selected for this member." }, "persona": { "type": "string", "description": "Persona persisted with the continuation and reapplied on resume." } }, "required": ["id", "name", "role", "status", "diagnostics"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 534, "column": 9 }
    },
    "agentTeams/getGoal": {
      service: "agentTeams",
      description: "Read the confirmed goal separately from Lead-authored notes.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Team member.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamGoalReview",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getGoal_result$schema,
        description: "detached proposal, decision, and current goal records.",
        jsonSchema: { "type": "object", "properties": { "goal": { "type": "object", "properties": { "revision": { "type": "number" }, "proposalRevision": { "type": "number" }, "status": { "type": "string", "enum": ["active", "revoked"] }, "definition": { "type": "object", "properties": { "objective": { "type": "string" }, "acceptanceCriteria": { "type": "array", "items": { "type": "string" } }, "scope": { "type": "object", "properties": { "coverage": { "type": "string", "enum": ["full", "partial", "task"] }, "targets": { "type": "array", "items": { "type": "string" } }, "allowedActions": { "type": "array", "items": { "type": "string" } }, "excludedTargets": { "type": "array", "items": { "type": "string" } }, "constraints": { "type": "array", "items": { "type": "string" } }, "execution": { "type": "object", "properties": { "readPaths": { "type": "array", "items": { "type": "string" } }, "writePaths": { "type": "array", "items": { "type": "string" } }, "webOrigins": { "type": "array", "items": { "type": "string" } }, "allowSearch": { "type": "boolean" }, "allowUnrestrictedExecution": { "type": "boolean", "description": "Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply." } }, "required": ["readPaths", "writePaths", "webOrigins", "allowSearch", "allowUnrestrictedExecution"], "additionalProperties": true, "description": "Absent in legacy goals; ordinary scope text never substitutes for these resource checks." } }, "required": ["coverage", "targets", "allowedActions", "excludedTargets", "constraints"], "additionalProperties": true }, "plan": { "type": "string", "description": "Complete member, model, task, dependency, and delivery plan reviewed with this goal." } }, "required": ["objective", "acceptanceCriteria", "scope"], "additionalProperties": true }, "decidedAt": { "type": "number" }, "revocationReason": { "type": "string" } }, "required": ["revision", "proposalRevision", "status", "definition", "decidedAt"], "additionalProperties": true }, "goalProposal": { "type": "object", "properties": { "revision": { "type": "number" }, "baseRevision": { "type": "number" }, "proposedBy": { "type": "string" }, "change": { "oneOf": [{ "type": "object", "properties": { "kind": { "type": "string", "const": "replace" }, "definition": { "type": "object", "properties": { "objective": { "type": "string" }, "acceptanceCriteria": { "type": "array", "items": { "type": "string" } }, "scope": { "type": "object", "properties": { "coverage": { "type": "string", "enum": ["full", "partial", "task"] }, "targets": { "type": "array", "items": { "type": "string" } }, "allowedActions": { "type": "array", "items": { "type": "string" } }, "excludedTargets": { "type": "array", "items": { "type": "string" } }, "constraints": { "type": "array", "items": { "type": "string" } }, "execution": { "type": "object", "properties": { "readPaths": { "type": "array", "items": { "type": "string" } }, "writePaths": { "type": "array", "items": { "type": "string" } }, "webOrigins": { "type": "array", "items": { "type": "string" } }, "allowSearch": { "type": "boolean" }, "allowUnrestrictedExecution": { "type": "boolean", "description": "Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply." } }, "required": ["readPaths", "writePaths", "webOrigins", "allowSearch", "allowUnrestrictedExecution"], "additionalProperties": true, "description": "Absent in legacy goals; ordinary scope text never substitutes for these resource checks." } }, "required": ["coverage", "targets", "allowedActions", "excludedTargets", "constraints"], "additionalProperties": true }, "plan": { "type": "string", "description": "Complete member, model, task, dependency, and delivery plan reviewed with this goal." } }, "required": ["objective", "acceptanceCriteria", "scope"], "additionalProperties": true } }, "required": ["kind", "definition"], "additionalProperties": true }, { "type": "object", "properties": { "kind": { "type": "string", "const": "revoke" }, "reason": { "type": "string" } }, "required": ["kind", "reason"], "additionalProperties": true }] } }, "required": ["revision", "baseRevision", "proposedBy", "change"], "additionalProperties": true }, "goalDecision": { "type": "object", "properties": { "proposalRevision": { "type": "number" }, "outcome": { "type": "string", "enum": ["accepted", "rejected"] }, "comment": { "type": "string" }, "decidedAt": { "type": "number" }, "channel": { "type": "string", "const": "user-question" } }, "required": ["proposalRevision", "outcome", "comment", "decidedAt", "channel"], "additionalProperties": true } }, "required": [], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 817, "column": 3 }
    },
    "agentTeams/getMessage": {
      service: "agentTeams",
      description: "Read one message for inspection before recovery or historical adoption.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live member of this Team.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "messageId",
          description: "Durable message identity.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamMessageId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_1$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamMessageId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_parameter_1_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamMessageSnapshot",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getMessage_result$schema,
        description: "a detached saved message including its full content.",
        jsonSchemaError: "typert tool schema: unsupported never value"
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 884, "column": 3 }
    },
    "agentTeams/getWorkspace": {
      service: "agentTeams",
      description: "Inspect a member's private working copy without reading project contents.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Team member.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "target",
          description: "Durable member name.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/getWorkspace:target",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_1$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/getWorkspace:target",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_parameter_1_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime#agentTeams/getWorkspace:result",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_getWorkspace_result$schema,
        description: "its saved isolation details, or null for a shared-workspace member.",
        jsonSchema: { "oneOf": [{ "type": "null", "const": null }, { "type": "object", "properties": { "cwd": { "type": "string" }, "baselineManifestPath": { "type": "string" }, "maxMode": { "type": "string", "enum": ["read-only", "workspace-write"] } }, "required": ["cwd", "baselineManifestPath", "maxMode"], "additionalProperties": true }] }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 642, "column": 3 }
    },
    "agentTeams/integrateWorkspace": {
      service: "agentTeams",
      description: "Publish an inactive member's changes after checking the captured shared-file versions.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Team Lead owning integration.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "target",
          description: "Durable member name whose work is ready to integrate.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/integrateWorkspace:target",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_1$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/integrateWorkspace:target",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_parameter_1_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime#agentTeams/integrateWorkspace:result",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_integrateWorkspace_result$schema,
        description: "the paths recorded by the resumable integration receipt.",
        jsonSchema: { "type": "object", "properties": { "paths": { "type": "array", "items": { "type": "string" } } }, "required": ["paths"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 688, "column": 9 }
    },
    "agentTeams/listMessagePage": {
      service: "agentTeams",
      description: "Read a bounded newest-first mailbox page.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live member of this Team.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "offset",
          description: "Number of newer records to skip.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/listMessagePage:offset",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_1$schema,
            jsonSchema: { "type": "number" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/listMessagePage:offset",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_1_strict$schema,
            jsonSchema: { "type": "number" }
          }
        },
        {
          name: "limit",
          description: "Page length from one through fifty.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/listMessagePage:limit",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_2$schema,
            jsonSchema: { "type": "number" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/listMessagePage:limit",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_parameter_2_strict$schema,
            jsonSchema: { "type": "number" }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamMailboxPage",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessagePage_result$schema,
        description: "delivery summaries and the total available count.",
        jsonSchema: { "type": "object", "properties": { "total": { "type": "number" }, "items": { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "senderId": { "type": "string" }, "senderName": { "type": "string" }, "targetId": { "type": "string" }, "goalRevision": { "type": "number" }, "adoptedFrom": { "type": "string" }, "status": { "type": "string", "enum": ["pending", "quarantined", "delivered", "retry-exhausted"] }, "attempts": { "type": "number" }, "error": { "type": "string" }, "nextAttemptAt": { "type": "number" } }, "required": ["id", "senderId", "senderName", "targetId", "status", "attempts"], "additionalProperties": true } } }, "required": ["total", "items"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 873, "column": 3 }
    },
    "agentTeams/listMessages": {
      service: "agentTeams",
      description: "Read delivery state without copying message bodies into the caller's context.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live member of this Team.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime#agentTeams/listMessages:result",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listMessages_result$schema,
        description: "ordered mailbox summaries, including quarantined history.",
        jsonSchema: { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "senderId": { "type": "string" }, "senderName": { "type": "string" }, "targetId": { "type": "string" }, "goalRevision": { "type": "number" }, "adoptedFrom": { "type": "string" }, "status": { "type": "string", "enum": ["pending", "quarantined", "delivered", "retry-exhausted"] }, "attempts": { "type": "number" }, "error": { "type": "string" }, "nextAttemptAt": { "type": "number" } }, "required": ["id", "senderId", "senderName", "targetId", "status", "attempts"], "additionalProperties": true } }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 861, "column": 3 }
    },
    "agentTeams/listTaskArchive": {
      service: "agentTeams",
      description: "Read a bounded page of completed tasks without consuming the active task quota.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Team member.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "request",
          description: "Exclusive archive cursor and requested page length.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#ListTeamTaskArchiveRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_1$schema,
            jsonSchema: { "type": "object", "properties": { "after": { "type": "string", "description": "Exclusive cursor from the preceding archive page." }, "limit": { "type": "number" } }, "required": ["limit"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#ListTeamTaskArchiveRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_parameter_1_strict$schema,
            jsonSchema: { "type": "object", "properties": { "after": { "type": "string", "description": "Exclusive cursor from the preceding archive page." }, "limit": { "type": "number" } }, "required": ["limit"], "additionalProperties": false }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamTaskArchivePage",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_listTaskArchive_result$schema,
        description: "retained task views and the next cursor when more completions exist.",
        jsonSchema: { "type": "object", "properties": { "tasks": { "type": "array", "items": { "type": "object", "properties": { "dispatchBlocker": { "type": "string", "enum": ["goal", "dependencies", "reviewer_missing", "adviser_review", "skills", "manual"] }, "work": { "type": "object", "properties": { "plan": { "type": "object", "properties": { "inputPaths": { "type": "array", "items": { "type": "string" } }, "adviserGate": { "type": "string", "const": "dual" }, "revision": { "type": "number" }, "plannerId": { "type": "string" }, "goalRevision": { "type": "number", "description": "Zero denotes a Team that has no confirmed goal yet." }, "inputs": { "type": "array", "items": { "type": "object", "properties": { "path": { "type": "string", "description": "Logical project-relative output path." }, "bytes": { "type": "number", "description": "Host-observed byte length." }, "sha256": { "type": "string", "description": "Lowercase hexadecimal digest of the complete file bytes." } }, "required": ["path", "bytes", "sha256"], "additionalProperties": true }, "description": "Host-observed inputs; absent on legacy plans." }, "environment": { "type": "object", "properties": { "workspaceRoot": { "type": "string" }, "platform": { "type": "string" }, "arch": { "type": "string" }, "nodeVersion": { "type": "string" } }, "required": ["workspaceRoot", "platform", "arch", "nodeVersion"], "additionalProperties": true, "description": "Host-observed local runtime; absent on legacy plans." }, "inputVersion": { "type": "string", "description": "Version of the supplied inputs; this declaration alone does not inspect files." }, "environmentVersion": { "type": "string", "description": "Version of the relevant tools, devices, and runtime conditions." }, "acceptanceCriteria": { "type": "array", "items": { "type": "string" } } }, "required": ["revision", "plannerId", "goalRevision", "inputVersion", "environmentVersion", "acceptanceCriteria"], "additionalProperties": true }, "attempts": { "type": "number" }, "execution": { "type": "object", "properties": { "id": { "type": "string" }, "ownerId": { "type": "string" }, "planRevision": { "type": "number" }, "dependencies": { "type": "array", "items": { "type": "object", "properties": { "taskId": { "type": "string" }, "revision": { "type": "number" } }, "required": ["taskId", "revision"], "additionalProperties": true } }, "phase": { "type": "string", "enum": ["cancelled", "running", "submitted", "accepted", "rejected"] }, "effectTracking": { "type": "string", "const": "observed", "description": "Absent on attempts created before tool dispatch tracking was installed." }, "effectReview": { "type": "object", "properties": { "reviewerId": { "type": "string" }, "resolution": { "type": "string", "enum": ["none", "known"] }, "summary": { "type": "string" }, "evidence": { "type": "array", "items": { "type": "string" } }, "observedCalls": { "type": "number" } }, "required": ["reviewerId", "resolution", "summary", "evidence", "observedCalls"], "additionalProperties": true }, "submission": { "type": "object", "properties": { "result": { "type": "string" }, "evidence": { "type": "array", "items": { "type": "string" } }, "artifacts": { "type": "array", "items": { "type": "object", "properties": { "path": { "type": "string", "description": "Logical project-relative output path." }, "bytes": { "type": "number", "description": "Host-observed byte length." }, "sha256": { "type": "string", "description": "Lowercase hexadecimal digest of the complete file bytes." } }, "required": ["path", "bytes", "sha256"], "additionalProperties": true }, "description": "Host-observed output files; absent on legacy submissions." }, "environment": { "type": "object", "properties": { "workspaceRoot": { "type": "string" }, "platform": { "type": "string" }, "arch": { "type": "string" }, "nodeVersion": { "type": "string" } }, "required": ["workspaceRoot", "platform", "arch", "nodeVersion"], "additionalProperties": true, "description": "Host-observed executor workspace and runtime for the artifact receipts." }, "sideEffects": { "type": "string", "enum": ["unknown", "none", "known"], "description": "Caller declaration, never by itself proof that no external side effect occurred." }, "sideEffectEvidence": { "type": "array", "items": { "type": "string" } } }, "required": ["result", "evidence"], "additionalProperties": true }, "review": { "type": "object", "properties": { "reviewerId": { "type": "string" }, "decision": { "type": "string", "enum": ["accepted", "rejected"] }, "summary": { "type": "string" }, "evidence": { "type": "array", "items": { "type": "string" } } }, "required": ["reviewerId", "decision", "summary", "evidence"], "additionalProperties": true } }, "required": ["id", "ownerId", "planRevision", "dependencies", "phase"], "additionalProperties": true } }, "required": ["plan", "attempts"], "additionalProperties": true }, "validity": { "type": "object", "properties": { "reusable": { "type": "boolean" }, "reasons": { "type": "array", "items": { "type": "string" } } }, "required": ["reusable", "reasons"], "additionalProperties": true }, "recovery": { "type": "object", "properties": { "reason": { "type": "string", "const": "owner_inactive" }, "action": { "type": "string", "enum": ["resume", "reconcile", "review", "inspect"] } }, "required": ["reason", "action"], "additionalProperties": true, "description": "Runtime-only next step when an inactive owner leaves a task in progress." }, "id": { "type": "string" }, "revision": { "type": "number" }, "subject": { "type": "string" }, "description": { "type": "string" }, "status": { "type": "string", "enum": ["completed", "pending", "in_progress", "deleted"] }, "blockedBy": { "type": "array", "items": { "type": "string" } }, "writeScopes": { "type": "array", "items": { "type": "string" } }, "ownerName": { "type": "string" }, "reviewerName": { "type": "string" }, "requiredSkill": { "type": "string" }, "autoAssign": { "type": "boolean" }, "ready": { "type": "boolean" }, "writeScopeWarnings": { "type": "array", "items": { "type": "string" } }, "inputKey": { "type": "string", "description": "Caller-supplied input version, or a configured hash of the original task inputs." }, "result": { "type": "string", "description": "Reusable completion summary." }, "evidence": { "type": "array", "items": { "type": "string" }, "description": "Artifact paths, source URLs, or executed verification facts supporting the result." } }, "required": ["validity", "id", "revision", "subject", "description", "status", "blockedBy", "writeScopes", "ready", "writeScopeWarnings"], "additionalProperties": true } }, "nextCursor": { "type": "string" } }, "required": ["tasks"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 1021, "column": 3 }
    },
    "agentTeams/proposeGoal": {
      service: "agentTeams",
      description: "Propose a complete objective or withdrawal without changing execution authority.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Lead.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "request",
          description: "Current revisions and the proposed change.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#ProposeTeamGoalRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_1$schema,
            jsonSchema: { "type": "object", "properties": { "expectedProposalRevision": { "type": "number" }, "expectedGoalRevision": { "type": "number" }, "change": { "oneOf": [{ "type": "object", "properties": { "kind": { "type": "string", "const": "replace" }, "definition": { "type": "object", "properties": { "objective": { "type": "string" }, "acceptanceCriteria": { "type": "array", "items": { "type": "string" } }, "scope": { "type": "object", "properties": { "coverage": { "type": "string", "enum": ["full", "partial", "task"] }, "targets": { "type": "array", "items": { "type": "string" } }, "allowedActions": { "type": "array", "items": { "type": "string" } }, "excludedTargets": { "type": "array", "items": { "type": "string" } }, "constraints": { "type": "array", "items": { "type": "string" } }, "execution": { "type": "object", "properties": { "readPaths": { "type": "array", "items": { "type": "string" } }, "writePaths": { "type": "array", "items": { "type": "string" } }, "webOrigins": { "type": "array", "items": { "type": "string" } }, "allowSearch": { "type": "boolean" }, "allowUnrestrictedExecution": { "type": "boolean", "description": "Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply." } }, "required": ["readPaths", "writePaths", "webOrigins", "allowSearch", "allowUnrestrictedExecution"], "additionalProperties": true, "description": "Absent in legacy goals; ordinary scope text never substitutes for these resource checks." } }, "required": ["coverage", "targets", "allowedActions", "excludedTargets", "constraints"], "additionalProperties": true }, "plan": { "type": "string", "description": "Complete member, model, task, dependency, and delivery plan reviewed with this goal." } }, "required": ["objective", "acceptanceCriteria", "scope"], "additionalProperties": true } }, "required": ["kind", "definition"], "additionalProperties": true }, { "type": "object", "properties": { "kind": { "type": "string", "const": "revoke" }, "reason": { "type": "string" } }, "required": ["kind", "reason"], "additionalProperties": true }] } }, "required": ["expectedProposalRevision", "expectedGoalRevision", "change"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#ProposeTeamGoalRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_parameter_1_strict$schema,
            jsonSchema: { "type": "object", "properties": { "expectedProposalRevision": { "type": "number" }, "expectedGoalRevision": { "type": "number" }, "change": { "oneOf": [{ "type": "object", "properties": { "kind": { "type": "string", "const": "replace" }, "definition": { "type": "object", "properties": { "objective": { "type": "string" }, "acceptanceCriteria": { "type": "array", "items": { "type": "string" } }, "scope": { "type": "object", "properties": { "coverage": { "type": "string", "enum": ["full", "partial", "task"] }, "targets": { "type": "array", "items": { "type": "string" } }, "allowedActions": { "type": "array", "items": { "type": "string" } }, "excludedTargets": { "type": "array", "items": { "type": "string" } }, "constraints": { "type": "array", "items": { "type": "string" } }, "execution": { "type": "object", "properties": { "readPaths": { "type": "array", "items": { "type": "string" } }, "writePaths": { "type": "array", "items": { "type": "string" } }, "webOrigins": { "type": "array", "items": { "type": "string" } }, "allowSearch": { "type": "boolean" }, "allowUnrestrictedExecution": { "type": "boolean", "description": "Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply." } }, "required": ["readPaths", "writePaths", "webOrigins", "allowSearch", "allowUnrestrictedExecution"], "additionalProperties": false, "description": "Absent in legacy goals; ordinary scope text never substitutes for these resource checks." } }, "required": ["coverage", "targets", "allowedActions", "excludedTargets", "constraints"], "additionalProperties": false }, "plan": { "type": "string", "description": "Complete member, model, task, dependency, and delivery plan reviewed with this goal." } }, "required": ["objective", "acceptanceCriteria", "scope"], "additionalProperties": false } }, "required": ["kind", "definition"], "additionalProperties": false }, { "type": "object", "properties": { "kind": { "type": "string", "const": "revoke" }, "reason": { "type": "string" } }, "required": ["kind", "reason"], "additionalProperties": false }] } }, "required": ["expectedProposalRevision", "expectedGoalRevision", "change"], "additionalProperties": false }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamGoalProposal",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_proposeGoal_result$schema,
        description: "the pending proposal shown in the native user review.",
        jsonSchema: { "type": "object", "properties": { "revision": { "type": "number" }, "baseRevision": { "type": "number" }, "proposedBy": { "type": "string" }, "change": { "oneOf": [{ "type": "object", "properties": { "kind": { "type": "string", "const": "replace" }, "definition": { "type": "object", "properties": { "objective": { "type": "string" }, "acceptanceCriteria": { "type": "array", "items": { "type": "string" } }, "scope": { "type": "object", "properties": { "coverage": { "type": "string", "enum": ["full", "partial", "task"] }, "targets": { "type": "array", "items": { "type": "string" } }, "allowedActions": { "type": "array", "items": { "type": "string" } }, "excludedTargets": { "type": "array", "items": { "type": "string" } }, "constraints": { "type": "array", "items": { "type": "string" } }, "execution": { "type": "object", "properties": { "readPaths": { "type": "array", "items": { "type": "string" } }, "writePaths": { "type": "array", "items": { "type": "string" } }, "webOrigins": { "type": "array", "items": { "type": "string" } }, "allowSearch": { "type": "boolean" }, "allowUnrestrictedExecution": { "type": "boolean", "description": "Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply." } }, "required": ["readPaths", "writePaths", "webOrigins", "allowSearch", "allowUnrestrictedExecution"], "additionalProperties": true, "description": "Absent in legacy goals; ordinary scope text never substitutes for these resource checks." } }, "required": ["coverage", "targets", "allowedActions", "excludedTargets", "constraints"], "additionalProperties": true }, "plan": { "type": "string", "description": "Complete member, model, task, dependency, and delivery plan reviewed with this goal." } }, "required": ["objective", "acceptanceCriteria", "scope"], "additionalProperties": true } }, "required": ["kind", "definition"], "additionalProperties": true }, { "type": "object", "properties": { "kind": { "type": "string", "const": "revoke" }, "reason": { "type": "string" } }, "required": ["kind", "reason"], "additionalProperties": true }] } }, "required": ["revision", "baseRevision", "proposedBy", "change"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 829, "column": 9 }
    },
    "agentTeams/reactivateMember": {
      service: "agentTeams",
      description: "Return a retired member to the active roster without submitting another prompt.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live parent or Team Lead.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "target",
          description: "Retained member name to reuse.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/reactivateMember:target",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_1$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/reactivateMember:target",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_parameter_1_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamMemberView",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reactivateMember_result$schema,
        description: "the active member's current row; sending a message starts its next work.",
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "parentId": { "type": "string" }, "parentName": { "type": "string" }, "name": { "type": "string" }, "role": { "type": "string", "enum": ["lead", "teammate"] }, "status": { "type": "string", "enum": ["failed", "running", "provisioning", "retired", "inactive"] }, "description": { "type": "string" }, "provider": { "type": "string" }, "context": { "type": "string", "enum": ["fresh", "fork"] }, "diagnostics": { "type": "array", "items": { "type": "string" } }, "modelRouteRevision": { "type": "number", "description": "Revision of an in-place model choice; absent when still using the creation route." }, "roleRevision": { "type": "number", "description": "Revision of the current responsibility; omitted for the creation-time role." }, "teamFunction": { "type": "string", "enum": ["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"], "description": "Team responsibility chosen by the delegating member; absent historical rows stay valid." }, "expert": { "type": "object", "properties": { "id": { "type": "string" }, "revision": { "type": "number" }, "name": { "type": "string" } }, "required": ["id", "revision", "name"], "additionalProperties": true, "description": "Creation-time profile identity; repeated assignment reuses this member." }, "modelProvider": { "type": "string", "description": "Registered language-model provider, distinct from the subagent provider." }, "model": { "type": "string", "description": "Exact model selected when the member was created." }, "reasoningEffort": { "type": "string", "description": "Adapter-supported reasoning effort selected for this member." }, "persona": { "type": "string", "description": "Persona persisted with the continuation and reapplied on resume." } }, "required": ["id", "name", "role", "status", "diagnostics"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 631, "column": 9 }
    },
    "agentTeams/readTaskArtifact": {
      service: "agentTeams",
      description: "Inspect a submitted artifact without exposing another member's private directory.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Team member requesting evidence.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "request",
          description: "Task, execution, receipt path, and optional continuation offset.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamTaskArtifactReadRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_1$schema,
            jsonSchema: { "type": "object", "properties": { "taskId": { "type": "string" }, "executionId": { "type": "string" }, "path": { "type": "string" }, "byteOffset": { "type": "number" } }, "required": ["taskId", "executionId", "path"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamTaskArtifactReadRequest",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_parameter_1_strict$schema,
            jsonSchema: { "type": "object", "properties": { "taskId": { "type": "string" }, "executionId": { "type": "string" }, "path": { "type": "string" }, "byteOffset": { "type": "number" } }, "required": ["taskId", "executionId", "path"], "additionalProperties": false }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamTaskArtifactReadResult",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_readTaskArtifact_result$schema,
        description: "verified text and the next byte offset when more remains.",
        jsonSchema: { "type": "object", "properties": { "taskId": { "type": "string" }, "executionId": { "type": "string" }, "path": { "type": "string" }, "sha256": { "type": "string" }, "totalBytes": { "type": "number" }, "byteOffset": { "type": "number" }, "content": { "type": "string" }, "nextByteOffset": { "type": "number" } }, "required": ["taskId", "executionId", "path", "sha256", "totalBytes", "byteOffset", "content"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 1045, "column": 9 }
    },
    "agentTeams/retireMember": {
      service: "agentTeams",
      description: "Retire an inactive direct child or any inactive member when called by its Lead.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live parent or Team Lead.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "target",
          description: "Durable member name whose history and identity remain retained.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/retireMember:target",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_1$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/retireMember:target",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_parameter_1_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamMemberView",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retireMember_result$schema,
        description: "the retired member's current row.",
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "parentId": { "type": "string" }, "parentName": { "type": "string" }, "name": { "type": "string" }, "role": { "type": "string", "enum": ["lead", "teammate"] }, "status": { "type": "string", "enum": ["failed", "running", "provisioning", "retired", "inactive"] }, "description": { "type": "string" }, "provider": { "type": "string" }, "context": { "type": "string", "enum": ["fresh", "fork"] }, "diagnostics": { "type": "array", "items": { "type": "string" } }, "modelRouteRevision": { "type": "number", "description": "Revision of an in-place model choice; absent when still using the creation route." }, "roleRevision": { "type": "number", "description": "Revision of the current responsibility; omitted for the creation-time role." }, "teamFunction": { "type": "string", "enum": ["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"], "description": "Team responsibility chosen by the delegating member; absent historical rows stay valid." }, "expert": { "type": "object", "properties": { "id": { "type": "string" }, "revision": { "type": "number" }, "name": { "type": "string" } }, "required": ["id", "revision", "name"], "additionalProperties": true, "description": "Creation-time profile identity; repeated assignment reuses this member." }, "modelProvider": { "type": "string", "description": "Registered language-model provider, distinct from the subagent provider." }, "model": { "type": "string", "description": "Exact model selected when the member was created." }, "reasoningEffort": { "type": "string", "description": "Adapter-supported reasoning effort selected for this member." }, "persona": { "type": "string", "description": "Persona persisted with the continuation and reapplied on resume." } }, "required": ["id", "name", "role", "status", "diagnostics"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 619, "column": 9 }
    },
    "agentTeams/retryMessage": {
      service: "agentTeams",
      description: "Retry delivery of a message belonging to the current confirmed goal.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live member authorized to recover this message.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "messageId",
          description: "Durable message identity.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamMessageId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_1$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamMessageId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_parameter_1_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#SendTeamMessageResult",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_retryMessage_result$schema,
        description: "its immediate delivery observation.",
        jsonSchema: { "type": "object", "properties": { "messageId": { "type": "string" }, "status": { "type": "string", "enum": ["accepted", "queued"] } }, "required": ["messageId", "status"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 896, "column": 9 }
    },
    "agentTeams/reviewGoal": {
      service: "agentTeams",
      description: "Ask the user to accept or revise the current persisted proposal.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Lead; descendants relay their questions to it.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "proposalRevision",
          description: "Exact proposal being reviewed.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/reviewGoal:proposalRevision",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_1$schema,
            jsonSchema: { "type": "number" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#agentTeams/reviewGoal:proposalRevision",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_parameter_1_strict$schema,
            jsonSchema: { "type": "number" }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamGoalReview",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_reviewGoal_result$schema,
        description: "committed goal review state; stale answers cannot apply.",
        jsonSchema: { "type": "object", "properties": { "goal": { "type": "object", "properties": { "revision": { "type": "number" }, "proposalRevision": { "type": "number" }, "status": { "type": "string", "enum": ["active", "revoked"] }, "definition": { "type": "object", "properties": { "objective": { "type": "string" }, "acceptanceCriteria": { "type": "array", "items": { "type": "string" } }, "scope": { "type": "object", "properties": { "coverage": { "type": "string", "enum": ["full", "partial", "task"] }, "targets": { "type": "array", "items": { "type": "string" } }, "allowedActions": { "type": "array", "items": { "type": "string" } }, "excludedTargets": { "type": "array", "items": { "type": "string" } }, "constraints": { "type": "array", "items": { "type": "string" } }, "execution": { "type": "object", "properties": { "readPaths": { "type": "array", "items": { "type": "string" } }, "writePaths": { "type": "array", "items": { "type": "string" } }, "webOrigins": { "type": "array", "items": { "type": "string" } }, "allowSearch": { "type": "boolean" }, "allowUnrestrictedExecution": { "type": "boolean", "description": "Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply." } }, "required": ["readPaths", "writePaths", "webOrigins", "allowSearch", "allowUnrestrictedExecution"], "additionalProperties": true, "description": "Absent in legacy goals; ordinary scope text never substitutes for these resource checks." } }, "required": ["coverage", "targets", "allowedActions", "excludedTargets", "constraints"], "additionalProperties": true }, "plan": { "type": "string", "description": "Complete member, model, task, dependency, and delivery plan reviewed with this goal." } }, "required": ["objective", "acceptanceCriteria", "scope"], "additionalProperties": true }, "decidedAt": { "type": "number" }, "revocationReason": { "type": "string" } }, "required": ["revision", "proposalRevision", "status", "definition", "decidedAt"], "additionalProperties": true }, "goalProposal": { "type": "object", "properties": { "revision": { "type": "number" }, "baseRevision": { "type": "number" }, "proposedBy": { "type": "string" }, "change": { "oneOf": [{ "type": "object", "properties": { "kind": { "type": "string", "const": "replace" }, "definition": { "type": "object", "properties": { "objective": { "type": "string" }, "acceptanceCriteria": { "type": "array", "items": { "type": "string" } }, "scope": { "type": "object", "properties": { "coverage": { "type": "string", "enum": ["full", "partial", "task"] }, "targets": { "type": "array", "items": { "type": "string" } }, "allowedActions": { "type": "array", "items": { "type": "string" } }, "excludedTargets": { "type": "array", "items": { "type": "string" } }, "constraints": { "type": "array", "items": { "type": "string" } }, "execution": { "type": "object", "properties": { "readPaths": { "type": "array", "items": { "type": "string" } }, "writePaths": { "type": "array", "items": { "type": "string" } }, "webOrigins": { "type": "array", "items": { "type": "string" } }, "allowSearch": { "type": "boolean" }, "allowUnrestrictedExecution": { "type": "boolean", "description": "Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply." } }, "required": ["readPaths", "writePaths", "webOrigins", "allowSearch", "allowUnrestrictedExecution"], "additionalProperties": true, "description": "Absent in legacy goals; ordinary scope text never substitutes for these resource checks." } }, "required": ["coverage", "targets", "allowedActions", "excludedTargets", "constraints"], "additionalProperties": true }, "plan": { "type": "string", "description": "Complete member, model, task, dependency, and delivery plan reviewed with this goal." } }, "required": ["objective", "acceptanceCriteria", "scope"], "additionalProperties": true } }, "required": ["kind", "definition"], "additionalProperties": true }, { "type": "object", "properties": { "kind": { "type": "string", "const": "revoke" }, "reason": { "type": "string" } }, "required": ["kind", "reason"], "additionalProperties": true }] } }, "required": ["revision", "baseRevision", "proposedBy", "change"], "additionalProperties": true }, "goalDecision": { "type": "object", "properties": { "proposalRevision": { "type": "number" }, "outcome": { "type": "string", "enum": ["accepted", "rejected"] }, "comment": { "type": "string" }, "decidedAt": { "type": "number" }, "channel": { "type": "string", "const": "user-question" } }, "required": ["proposalRevision", "outcome", "comment", "decidedAt", "channel"], "additionalProperties": true } }, "required": [], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 841, "column": 9 }
    },
    "agentTeams/validateTaskReuse": {
      service: "agentTeams",
      description: "Recheck observed files and environment before reusing a retained task result.",
      invocation: { kind: "direct" },
      scope: {
        context: "agent",
        wire: "agentId"
      },
      parameters: [
        {
          name: "agent",
          wire: "agentId",
          description: "Exact live Team member requesting verification.",
          source: "lookup",
          lookup: "agent",
          codec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "id",
          description: "Retained Team task identity.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamTaskId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_1$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamTaskId",
            create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_parameter_1_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamTaskReuseCheck",
        create: _deepseek_ai_dsh_experimental_agent_team_agentTeams_validateTaskReuse_result$schema,
        description: "the current reuse decision and concrete observations.",
        jsonSchema: { "type": "object", "properties": { "taskId": { "type": "string" }, "revision": { "type": "number" }, "checkedAt": { "type": "number" }, "validity": { "type": "object", "properties": { "reusable": { "type": "boolean" }, "reasons": { "type": "array", "items": { "type": "string" } } }, "required": ["reusable", "reasons"], "additionalProperties": true }, "inputs": { "type": "array", "items": { "type": "object", "properties": { "path": { "type": "string", "description": "Logical project-relative output path." }, "bytes": { "type": "number", "description": "Host-observed byte length." }, "sha256": { "type": "string", "description": "Lowercase hexadecimal digest of the complete file bytes." } }, "required": ["path", "bytes", "sha256"], "additionalProperties": true } }, "artifacts": { "type": "array", "items": { "type": "object", "properties": { "path": { "type": "string", "description": "Logical project-relative output path." }, "bytes": { "type": "number", "description": "Host-observed byte length." }, "sha256": { "type": "string", "description": "Lowercase hexadecimal digest of the complete file bytes." } }, "required": ["path", "bytes", "sha256"], "additionalProperties": true } }, "environment": { "type": "object", "properties": { "workspaceRoot": { "type": "string" }, "platform": { "type": "string" }, "arch": { "type": "string" }, "nodeVersion": { "type": "string" } }, "required": ["workspaceRoot", "platform", "arch", "nodeVersion"], "additionalProperties": true }, "artifactEnvironment": { "type": "object", "properties": { "workspaceRoot": { "type": "string" }, "platform": { "type": "string" }, "arch": { "type": "string" }, "nodeVersion": { "type": "string" } }, "required": ["workspaceRoot", "platform", "arch", "nodeVersion"], "additionalProperties": true } }, "required": ["taskId", "revision", "checkedAt", "validity", "inputs", "artifacts"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/index.ts", "line": 1033, "column": 9 }
    },
    "teamExperts/create": {
      service: "teamExperts",
      description: "Save a new reusable role without generating a model response.",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "definition",
          description: "Validated full role definition.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertDefinition",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_parameter_0$schema,
            jsonSchema: { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "persona": { "type": "string" }, "instructions": { "type": "string", "description": "AGENT.md text copied into the continuable member's logged persona." }, "skills": { "type": "array", "items": { "type": "string" }, "description": "Available skill names to consult; these references do not install skills." }, "modelProvider": { "type": "string", "description": "Omit provider and model together to inherit the assigning parent's route." }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["name", "description", "persona", "instructions", "skills"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertDefinition",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_parameter_0_strict$schema,
            jsonSchema: { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "persona": { "type": "string" }, "instructions": { "type": "string", "description": "AGENT.md text copied into the continuable member's logged persona." }, "skills": { "type": "array", "items": { "type": "string" }, "description": "Available skill names to consult; these references do not install skills." }, "modelProvider": { "type": "string", "description": "Omit provider and model together to inherit the assigning parent's route." }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["name", "description", "persona", "instructions", "skills"], "additionalProperties": false }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertView",
        create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_create_result$schema,
        description: "the committed revision-one profile.",
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "definition": { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "persona": { "type": "string" }, "instructions": { "type": "string", "description": "AGENT.md text copied into the continuable member's logged persona." }, "skills": { "type": "array", "items": { "type": "string" }, "description": "Available skill names to consult; these references do not install skills." }, "modelProvider": { "type": "string", "description": "Omit provider and model together to inherit the assigning parent's route." }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["name", "description", "persona", "instructions", "skills"], "additionalProperties": true }, "revision": { "type": "number" }, "createdAt": { "type": "number" }, "updatedAt": { "type": "number" }, "archived": { "type": "boolean" }, "ownerTeamId": { "type": "string", "description": "Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template." }, "ownerMemberId": { "type": "string", "description": "Member that authored this Team-local profile." } }, "required": ["id", "definition", "revision", "createdAt", "updatedAt", "archived"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/experts.ts", "line": 92, "column": 9 }
    },
    "teamExperts/get": {
      service: "teamExperts",
      description: "Read one profile, including an archived profile.",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "id",
          description: "Stable catalog identity.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertId",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertId",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertView",
        create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_get_result$schema,
        description: "a detached profile; missing identities throw.",
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "definition": { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "persona": { "type": "string" }, "instructions": { "type": "string", "description": "AGENT.md text copied into the continuable member's logged persona." }, "skills": { "type": "array", "items": { "type": "string" }, "description": "Available skill names to consult; these references do not install skills." }, "modelProvider": { "type": "string", "description": "Omit provider and model together to inherit the assigning parent's route." }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["name", "description", "persona", "instructions", "skills"], "additionalProperties": true }, "revision": { "type": "number" }, "createdAt": { "type": "number" }, "updatedAt": { "type": "number" }, "archived": { "type": "boolean" }, "ownerTeamId": { "type": "string", "description": "Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template." }, "ownerMemberId": { "type": "string", "description": "Member that authored this Team-local profile." } }, "required": ["id", "definition", "revision", "createdAt", "updatedAt", "archived"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/experts.ts", "line": 78, "column": 3 }
    },
    "teamExperts/list": {
      service: "teamExperts",
      description: "Read the catalog without resolving models or starting turns.",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "includeArchived",
          description: "Include profiles hidden from normal assignment.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#teamExperts/list:includeArchived",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_parameter_0$schema,
            jsonSchema: { "type": "boolean" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#teamExperts/list:includeArchived",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_parameter_0_strict$schema,
            jsonSchema: { "type": "boolean" }
          }
        }
      ],
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime#teamExperts/list:result",
        create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_list_result$schema,
        description: "detached profiles in stable creation order.",
        jsonSchema: { "type": "array", "items": { "type": "object", "properties": { "id": { "type": "string" }, "definition": { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "persona": { "type": "string" }, "instructions": { "type": "string", "description": "AGENT.md text copied into the continuable member's logged persona." }, "skills": { "type": "array", "items": { "type": "string" }, "description": "Available skill names to consult; these references do not install skills." }, "modelProvider": { "type": "string", "description": "Omit provider and model together to inherit the assigning parent's route." }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["name", "description", "persona", "instructions", "skills"], "additionalProperties": true }, "revision": { "type": "number" }, "createdAt": { "type": "number" }, "updatedAt": { "type": "number" }, "archived": { "type": "boolean" }, "ownerTeamId": { "type": "string", "description": "Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template." }, "ownerMemberId": { "type": "string", "description": "Member that authored this Team-local profile." } }, "required": ["id", "definition", "revision", "createdAt", "updatedAt", "archived"], "additionalProperties": true } }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/experts.ts", "line": 62, "column": 3 }
    },
    "teamExperts/update": {
      service: "teamExperts",
      description: "Replace a profile using its last observed revision; bound members keep their saved copy.",
      invocation: { kind: "direct" },
      parameters: [
        {
          name: "id",
          description: "Stable catalog identity.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertId",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_0$schema,
            jsonSchema: { "type": "string" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertId",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_0_strict$schema,
            jsonSchema: { "type": "string" }
          }
        },
        {
          name: "expectedRevision",
          description: "Revision observed before editing.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#teamExperts/update:expectedRevision",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_1$schema,
            jsonSchema: { "type": "number" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#teamExperts/update:expectedRevision",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_1_strict$schema,
            jsonSchema: { "type": "number" }
          }
        },
        {
          name: "definition",
          description: "Validated complete replacement definition.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertDefinition",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_2$schema,
            jsonSchema: { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "persona": { "type": "string" }, "instructions": { "type": "string", "description": "AGENT.md text copied into the continuable member's logged persona." }, "skills": { "type": "array", "items": { "type": "string" }, "description": "Available skill names to consult; these references do not install skills." }, "modelProvider": { "type": "string", "description": "Omit provider and model together to inherit the assigning parent's route." }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["name", "description", "persona", "instructions", "skills"], "additionalProperties": true }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertDefinition",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_2_strict$schema,
            jsonSchema: { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "persona": { "type": "string" }, "instructions": { "type": "string", "description": "AGENT.md text copied into the continuable member's logged persona." }, "skills": { "type": "array", "items": { "type": "string" }, "description": "Available skill names to consult; these references do not install skills." }, "modelProvider": { "type": "string", "description": "Omit provider and model together to inherit the assigning parent's route." }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["name", "description", "persona", "instructions", "skills"], "additionalProperties": false }
          }
        },
        {
          name: "archived",
          description: "Whether to hide the profile from new assignments.",
          source: "json",
          codec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#teamExperts/update:archived",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_3$schema,
            jsonSchema: { "type": "boolean" }
          },
          strictCodec: {
            mode: "strict",
            typeSymbol: "dsh-team-workbench/runtime#teamExperts/update:archived",
            create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_parameter_3_strict$schema,
            jsonSchema: { "type": "boolean" }
          }
        }
      ],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: "dsh-team-workbench/runtime/client#TeamExpertView",
        create: _deepseek_ai_dsh_experimental_agent_team_teamExperts_update_result$schema,
        description: "the committed next profile revision.",
        jsonSchema: { "type": "object", "properties": { "id": { "type": "string" }, "definition": { "type": "object", "properties": { "name": { "type": "string" }, "description": { "type": "string" }, "persona": { "type": "string" }, "instructions": { "type": "string", "description": "AGENT.md text copied into the continuable member's logged persona." }, "skills": { "type": "array", "items": { "type": "string" }, "description": "Available skill names to consult; these references do not install skills." }, "modelProvider": { "type": "string", "description": "Omit provider and model together to inherit the assigning parent's route." }, "model": { "type": "string" }, "reasoningEffort": { "type": "string" } }, "required": ["name", "description", "persona", "instructions", "skills"], "additionalProperties": true }, "revision": { "type": "number" }, "createdAt": { "type": "number" }, "updatedAt": { "type": "number" }, "archived": { "type": "boolean" }, "ownerTeamId": { "type": "string", "description": "Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template." }, "ownerMemberId": { "type": "string", "description": "Member that authored this Team-local profile." } }, "required": ["id", "definition", "revision", "createdAt", "updatedAt", "archived"], "additionalProperties": true }
      },
      sourceLocation: { "file": "packages/experimental/agent-team/src/experts.ts", "line": 119, "column": 9 }
    }
  }
}, import_zod.z);
var typert_remote_client_default = TYPERT_REMOTE;

// packages/team/modules/ui/lib/types/client/TeamAction.js
var import_jsx_runtime6 = require("react/jsx-runtime");
var import_react3 = require("react");
var import_react_dom = require("react-dom");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// packages/team/modules/ui/lib/types/client/TaskWork.js
var import_jsx_runtime = require("react/jsx-runtime");

// packages/team/modules/ui/lib/types/client/TaskWork.module.css
var TaskWork_default = {
  details: "TaskWork_details",
  versions: "TaskWork_versions",
  hint: "TaskWork_hint"
};

// packages/team/modules/ui/lib/types/client/TaskWork.js
function taskWorkStateKey(task, ownerRunning, currentGoalRevision) {
  if (task.dispatchBlocker !== void 0)
    return `work.blocker.${task.dispatchBlocker}`;
  if (task.status === "pending" && task.writeScopeWarnings.some((warning) => warning.startsWith("exclusive resource is owned by task ")))
    return "work.resourceBusy";
  if (task.work === void 0) {
    if (task.status !== "in_progress")
      return void 0;
    return ownerRunning === true ? "status.in_progress" : ownerRunning === false ? "work.ownerInactive" : "work.ownerUnknown";
  }
  if (task.work.execution?.phase === "accepted" && !task.validity.reusable)
    return "work.stale";
  if (task.status !== "deleted" && currentGoalRevision !== void 0 && task.work.plan.goalRevision !== currentGoalRevision)
    return "work.goalChanged";
  if (task.work.execution?.phase === "running") {
    if (ownerRunning === true)
      return "work.phase.running";
    if (task.recovery !== void 0)
      return `work.recovery.${task.recovery.action}`;
    return ownerRunning === false ? "work.ownerInactive" : "work.ownerUnknown";
  }
  return `work.phase.${task.work.execution?.phase ?? "pending"}`;
}
function taskOwnerSessionId(task, members) {
  if (task.work?.execution?.ownerId !== void 0)
    return task.work.execution.ownerId;
  if (task.ownerName === void 0)
    return void 0;
  const matches = members.filter((member) => member.name === task.ownerName);
  return matches.length === 1 ? matches[0]?.id : void 0;
}
function duplicateTaskSubjects(tasks) {
  const counts = /* @__PURE__ */ new Map();
  for (const task of tasks) {
    const subject = task.subject.trim().toLocaleLowerCase();
    counts.set(subject, (counts.get(subject) ?? 0) + 1);
  }
  return new Set(tasks.filter((task) => (counts.get(task.subject.trim().toLocaleLowerCase()) ?? 0) > 1).map((task) => task.id));
}
function useTaskActivities(team, useSessions, useSessionStatus) {
  const tasks = team?.tasks ?? [];
  const members = team?.members ?? [];
  const live = useSessionStatus((state) => tasks.map((task) => {
    const ownerId = taskOwnerSessionId(task, members);
    const value = ownerId === void 0 ? void 0 : state.get(ownerId)?.running;
    return value === true ? "1" : value === false ? "0" : "?";
  }).join(""));
  const summaries = useSessions((state) => tasks.map((task) => {
    const ownerId = taskOwnerSessionId(task, members);
    const value = ownerId === void 0 ? void 0 : state.byId[ownerId]?.running;
    return value === true ? "1" : value === false ? "0" : "?";
  }).join(""));
  return new Map(tasks.map((task, index) => [
    task.id,
    live[index] === "1" ? true : live[index] === "0" ? false : summaries[index] === "1" ? true : summaries[index] === "0" ? false : void 0
  ]));
}
function TaskWorkDetails({ task, t }) {
  const work = task.work;
  if (work === void 0)
    return task.status === "completed" || task.result !== void 0 ? (0, import_jsx_runtime.jsx)("p", { className: TaskWork_default.hint, children: t("work.legacy") }) : null;
  const execution = work.execution;
  const submission = execution?.submission;
  return (0, import_jsx_runtime.jsxs)("details", { className: TaskWork_default.details, children: [(0, import_jsx_runtime.jsx)("summary", { children: t("work.details") }), (0, import_jsx_runtime.jsxs)("dl", { className: TaskWork_default.versions, children: [(0, import_jsx_runtime.jsx)("dt", { children: t("work.input") }), (0, import_jsx_runtime.jsx)("dd", { children: work.plan.inputVersion }), (0, import_jsx_runtime.jsx)("dt", { children: t("work.environment") }), (0, import_jsx_runtime.jsx)("dd", { children: work.plan.environmentVersion }), (0, import_jsx_runtime.jsx)("dt", { children: t("work.goal") }), (0, import_jsx_runtime.jsx)("dd", { children: work.plan.goalRevision }), (0, import_jsx_runtime.jsx)("dt", { children: t("work.plan") }), (0, import_jsx_runtime.jsx)("dd", { children: work.plan.revision }), (0, import_jsx_runtime.jsx)("dt", { children: t("work.attempt") }), (0, import_jsx_runtime.jsx)("dd", { children: work.attempts })] }), (0, import_jsx_runtime.jsx)("h4", { children: t("work.criteria") }), (0, import_jsx_runtime.jsx)("ol", { children: work.plan.acceptanceCriteria.map((criterion, index) => (0, import_jsx_runtime.jsx)("li", { children: criterion }, index)) }), submission !== void 0 && execution?.phase !== "accepted" && (0, import_jsx_runtime.jsxs)("section", { children: [(0, import_jsx_runtime.jsx)("h4", { children: t("work.submission") }), (0, import_jsx_runtime.jsx)("p", { children: submission.result }), (0, import_jsx_runtime.jsx)("ul", { children: submission.evidence.map((entry, index) => (0, import_jsx_runtime.jsx)("li", { children: entry }, index)) })] }), execution?.review !== void 0 && (0, import_jsx_runtime.jsxs)("section", { children: [(0, import_jsx_runtime.jsx)("h4", { children: t("work.review") }), (0, import_jsx_runtime.jsx)("p", { children: execution.review.summary }), (0, import_jsx_runtime.jsx)("ul", { children: execution.review.evidence.map((entry, index) => (0, import_jsx_runtime.jsx)("li", { children: entry }, index)) })] }), task.recovery !== void 0 && (0, import_jsx_runtime.jsx)("p", { className: TaskWork_default.hint, children: t(`work.recovery.${task.recovery.action}`) }), task.validity.reasons.length > 0 && (0, import_jsx_runtime.jsx)("ul", { className: TaskWork_default.hint, children: task.validity.reasons.map((reason) => (0, import_jsx_runtime.jsx)("li", { children: reason }, reason)) }), (0, import_jsx_runtime.jsx)("p", { className: TaskWork_default.hint, children: t("work.declaredVersions") })] });
}

// packages/team/modules/ui/lib/types/client/AdviserFindings.js
var import_jsx_runtime2 = require("react/jsx-runtime");
function AdviserFindings({ task, findings, t }) {
  if (task.work?.plan.adviserGate !== "dual")
    return null;
  const executionId = task.work.execution?.id;
  const current = (findings ?? []).filter((value) => value.taskId === task.id && value.executionId === executionId && value.goalRevision === task.work?.plan.goalRevision);
  const planning = current.findLast((value) => value.adviserFunction === "planning_adviser");
  const quality = current.findLast((value) => value.adviserFunction === "quality_adviser");
  const render = (label, value) => (0, import_jsx_runtime2.jsxs)("li", { children: [(0, import_jsx_runtime2.jsx)("strong", { children: label }), " \xB7 ", value === void 0 ? t("work.adviserPending") : value.decision === "approve" ? t("work.adviserApproved") : t("work.adviserRevise"), value !== void 0 && (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [(0, import_jsx_runtime2.jsx)("p", { children: value.summary }), (0, import_jsx_runtime2.jsx)("ul", { children: value.evidence.map((item, index) => (0, import_jsx_runtime2.jsx)("li", { children: item }, index)) })] })] });
  return (0, import_jsx_runtime2.jsxs)("details", { children: [(0, import_jsx_runtime2.jsx)("summary", { children: t("work.adviserGate") }), (0, import_jsx_runtime2.jsxs)("ul", { children: [render(t("view.function.planningAdviser"), planning), render(t("view.function.qualityAdviser"), quality)] })] });
}

// packages/team/modules/ui/lib/types/client/TeamAction.module.css
var TeamAction_default = {
  root: "TeamAction_root",
  trigger: "TeamAction_trigger",
  triggerLabel: "TeamAction_triggerLabel",
  count: "TeamAction_count",
  panel: "TeamAction_panel",
  panelCompact: "TeamAction_panelCompact",
  roster: "TeamAction_roster",
  body: "TeamAction_body",
  taskTitle: "TeamAction_taskTitle",
  taskSelect: "TeamAction_taskSelect",
  member: "TeamAction_member",
  memberConfiguration: "TeamAction_memberConfiguration",
  personaTag: "TeamAction_personaTag",
  memberCurrent: "TeamAction_memberCurrent",
  memberDot: "TeamAction_memberDot",
  inactiveIcon: "TeamAction_inactiveIcon",
  memberText: "TeamAction_memberText",
  memberName: "TeamAction_memberName",
  memberNameText: "TeamAction_memberNameText",
  memberModel: "TeamAction_memberModel",
  currentTag: "TeamAction_currentTag",
  meta: "TeamAction_meta",
  diagnostic: "TeamAction_diagnostic",
  error: "TeamAction_error",
  warning: "TeamAction_warning",
  tasks: "TeamAction_tasks",
  emptyNotice: "TeamAction_emptyNotice",
  task: "TeamAction_task",
  taskState: "TeamAction_taskState",
  clampedDescription: "TeamAction_clampedDescription",
  expandToggle: "TeamAction_expandToggle",
  expandToggleOpen: "TeamAction_expandToggleOpen",
  notice: "TeamAction_notice",
  workspacePanel: "TeamAction_workspacePanel",
  workspaceHeader: "TeamAction_workspaceHeader",
  headerActions: "TeamAction_headerActions",
  plan: "TeamAction_plan",
  eyebrow: "TeamAction_eyebrow",
  sectionHint: "TeamAction_sectionHint",
  roles: "TeamAction_roles",
  tabs: "TeamAction_tabs",
  metrics: "TeamAction_metrics",
  overviewColumns: "TeamAction_overviewColumns",
  taskGroup: "TeamAction_taskGroup",
  groupGrid: "TeamAction_groupGrid",
  groupHeading: "TeamAction_groupHeading",
  groupMore: "TeamAction_groupMore",
  groupPeople: "TeamAction_groupPeople",
  groupPerson: "TeamAction_groupPerson",
  groupEmpty: "TeamAction_groupEmpty",
  inspector: "TeamAction_inspector",
  memberDescription: "TeamAction_memberDescription",
  taskResult: "TeamAction_taskResult",
  evidence: "TeamAction_evidence",
  memory: "TeamAction_memory",
  roleColumns: "TeamAction_roleColumns",
  roleList: "TeamAction_roleList",
  roleChoice: "TeamAction_roleChoice",
  roleSelected: "TeamAction_roleSelected",
  roleForm: "TeamAction_roleForm",
  roleFormHeader: "TeamAction_roleFormHeader",
  modelFields: "TeamAction_modelFields",
  instructions: "TeamAction_instructions",
  editorFooter: "TeamAction_editorFooter",
  primaryButton: "TeamAction_primaryButton",
  secondaryButton: "TeamAction_secondaryButton",
  textButton: "TeamAction_textButton"
};

// packages/team/modules/ui/lib/types/client/ProjectPlanView.js
var import_jsx_runtime3 = require("react/jsx-runtime");

// packages/team/modules/runtime/src/project-plan.ts
var import_zod2 = require("zod");
var text = import_zod2.z.string().trim().min(1);
var memberName = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
var projectPath = text.refine((value) => !/^(?:[a-z]:|\/|\\)/iu.test(value) && !value.replaceAll("\\", "/").split("/").some((part) => part === ".." || part === "." || part === ""), "expected a project-relative file or directory path");
var projectPlanSchema = import_zod2.z.object({
  format: import_zod2.z.literal("dsh-team-project-plan"),
  version: import_zod2.z.union([import_zod2.z.literal(1), import_zod2.z.literal(2)]),
  automation: import_zod2.z.object({ provision: import_zod2.z.enum(["manual", "on-demand"]), requirePlanningGate: import_zod2.z.boolean() }).strict().optional(),
  members: import_zod2.z.array(import_zod2.z.object({
    name: memberName,
    parent: memberName,
    function: import_zod2.z.enum(["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"]),
    modelProvider: text,
    model: text,
    reasoningEffort: text,
    responsibility: text,
    skills: import_zod2.z.array(text).min(1),
    persona: text.optional(),
    instructions: text.optional()
  }).strict()).min(1),
  tasks: import_zod2.z.array(import_zod2.z.object({
    id: text,
    owner: text,
    reviewer: text,
    description: text,
    kind: import_zod2.z.enum(["plan", "route", "execution", "key_result", "delivery"]),
    dependencies: import_zod2.z.array(text),
    inputs: import_zod2.z.array(projectPath),
    outputs: import_zod2.z.array(projectPath),
    exclusiveResources: import_zod2.z.array(text.regex(/^[a-z0-9][a-z0-9:._/-]*$/u)).optional(),
    acceptanceCriteria: import_zod2.z.array(text).min(1),
    critical: import_zod2.z.boolean()
  }).strict()).min(1),
  resources: import_zod2.z.object({ maxMembers: import_zod2.z.number().int().positive(), maxConcurrentRequests: import_zod2.z.number().int().positive() }).strict(),
  reviewPolicy: import_zod2.z.literal("independent-and-dual-for-critical"),
  previousTasks: import_zod2.z.array(import_zod2.z.object({ id: text, action: import_zod2.z.enum(["retain_history", "replan"]), reason: text }).strict()),
  recovery: text
}).strict().superRefine((plan, ctx) => {
  if (plan.version === 1 && plan.automation !== void 0 || plan.version === 2 && plan.automation === void 0) {
    ctx.addIssue({ code: "custom", message: "automation is required only for version 2; version 1 retains manual provisioning" });
  }
  const names = new Set(plan.members.map((member) => member.name));
  const ids = new Set(plan.tasks.map((task) => task.id));
  if (names.size !== plan.members.length || names.has("lead") || ids.size !== plan.tasks.length) {
    ctx.addIssue({ code: "custom", message: "member and task names must be unique; lead is reserved" });
  }
  if (plan.members.length > plan.resources.maxMembers) ctx.addIssue({ code: "custom", message: "roster exceeds member budget" });
  for (const member of plan.members) {
    if (plan.version === 1 && (member.persona !== void 0 || member.instructions !== void 0)) ctx.addIssue({ code: "custom", message: "member persona and instructions require plan version 2" });
    if (new Set(member.skills).size !== member.skills.length) ctx.addIssue({ code: "custom", message: `duplicate skill for ${member.name}` });
    const visited = /* @__PURE__ */ new Set([member.name]);
    let parent = member.parent;
    while (parent !== "lead") {
      if (!names.has(parent) || visited.has(parent)) {
        ctx.addIssue({ code: "custom", message: `invalid parent chain for ${member.name}` });
        break;
      }
      visited.add(parent);
      const ancestor = plan.members.find((candidate) => candidate.name === parent);
      if (ancestor === void 0) break;
      parent = ancestor.parent;
    }
  }
  const completed = /* @__PURE__ */ new Set();
  const visit = (id, parents) => {
    if (parents.has(id) || !ids.has(id)) {
      ctx.addIssue({ code: "custom", message: `invalid dependency ${id}` });
      return;
    }
    if (completed.has(id)) return;
    const task = plan.tasks.find((candidate) => candidate.id === id);
    if (task === void 0) return;
    for (const dependency of task.dependencies) visit(dependency, /* @__PURE__ */ new Set([...parents, id]));
    completed.add(id);
  };
  for (const task of plan.tasks) {
    if (task.exclusiveResources !== void 0 && (plan.version === 1 || new Set(task.exclusiveResources).size !== task.exclusiveResources.length)) {
      ctx.addIssue({ code: "custom", message: `exclusiveResources requires version 2 and distinct resource keys for ${task.id}` });
    }
    if (task.critical !== (task.kind !== "execution")) ctx.addIssue({ code: "custom", message: `critical must match task kind for ${task.id}` });
    if (!names.has(task.owner) || !names.has(task.reviewer) || task.owner === task.reviewer) {
      ctx.addIssue({ code: "custom", message: `task ${task.id} needs different configured owner and reviewer` });
    }
    const owner = plan.members.find((member) => member.name === task.owner);
    if (owner?.function.endsWith("_adviser")) ctx.addIssue({ code: "custom", message: `adviser cannot execute ${task.id}` });
    if (plan.members.find((member) => member.name === task.reviewer)?.function.endsWith("_adviser")) {
      ctx.addIssue({ code: "custom", message: `task ${task.id} needs a separate verifier; advisers review the decision separately` });
    }
    if (new Set(task.dependencies).size !== task.dependencies.length || new Set(task.outputs).size !== task.outputs.length) {
      ctx.addIssue({ code: "custom", message: `duplicate dependency or output in ${task.id}` });
    }
    visit(task.id, /* @__PURE__ */ new Set());
  }
  if (plan.version === 2 && plan.automation?.requirePlanningGate) {
    const dependsOnPlan = (id, visited = /* @__PURE__ */ new Set()) => {
      if (visited.has(id)) return false;
      visited.add(id);
      const task = plan.tasks.find((candidate) => candidate.id === id);
      return task !== void 0 && (task.kind === "plan" || task.dependencies.some((dependency) => dependsOnPlan(dependency, visited)));
    };
    for (const task of plan.tasks) if (task.kind !== "plan" && !dependsOnPlan(task.id)) {
      ctx.addIssue({ code: "custom", message: `task ${task.id} must depend on a dual-reviewed plan task` });
    }
  }
  if (!plan.tasks.some((task) => task.kind === "delivery")) ctx.addIssue({ code: "custom", message: "project plan requires a final delivery task" });
  if (plan.tasks.some((task) => task.critical) && (!plan.members.some((member) => member.function === "planning_adviser") || !plan.members.some((member) => member.function === "quality_adviser"))) {
    ctx.addIssue({ code: "custom", message: "critical tasks require both planning and quality advisers" });
  }
});
function readProjectPlan(textValue) {
  if (textValue === void 0 || !textValue.trim().startsWith("{")) return void 0;
  let value;
  try {
    value = JSON.parse(textValue);
  } catch (error) {
    if (error instanceof SyntaxError) return void 0;
    throw error;
  }
  if (typeof value !== "object" || value === null || !("format" in value) || value.format !== "dsh-team-project-plan") return void 0;
  return projectPlanSchema.parse(value);
}

// packages/team/modules/ui/lib/types/client/TeamView.module.css
var TeamView_default = {
  page: "TeamView_page",
  "team-workbench": "TeamView_team-workbench",
  header: "TeamView_header",
  toolbar: "TeamView_toolbar",
  inspectorPane: "TeamView_inspectorPane",
  footer: "TeamView_footer",
  hint: "TeamView_hint",
  empty: "TeamView_empty",
  button: "TeamView_button",
  search: "TeamView_search",
  memberButton: "TeamView_memberButton",
  textButton: "TeamView_textButton",
  tabs: "TeamView_tabs",
  memberModelForm: "TeamView_memberModelForm",
  goal: "TeamView_goal",
  content: "TeamView_content",
  overviewGrid: "TeamView_overviewGrid",
  groupLane: "TeamView_groupLane",
  rosterPane: "TeamView_rosterPane",
  memberList: "TeamView_memberList",
  memberItem: "TeamView_memberItem",
  memberIdentity: "TeamView_memberIdentity",
  roleSummary: "TeamView_roleSummary",
  memberStatus: "TeamView_memberStatus",
  selectedRow: "TeamView_selectedRow",
  model: "TeamView_model",
  modelNote: "TeamView_modelNote",
  memberBadges: "TeamView_memberBadges",
  summary: "TeamView_summary",
  boardEmpty: "TeamView_boardEmpty",
  boardPane: "TeamView_boardPane",
  groupBoard: "TeamView_groupBoard",
  groupMembers: "TeamView_groupMembers",
  boardTask: "TeamView_boardTask",
  boardTaskSelected: "TeamView_boardTaskSelected",
  memberActions: "TeamView_memberActions",
  preservedText: "TeamView_preservedText",
  archive: "TeamView_archive",
  memory: "TeamView_memory",
  taskBody: "TeamView_taskBody",
  task: "TeamView_task",
  diagnosticGrid: "TeamView_diagnosticGrid",
  settings: "TeamView_settings",
  error: "TeamView_error",
  headerActions: "TeamView_headerActions",
  groupLabel: "TeamView_groupLabel",
  boardFilters: "TeamView_boardFilters",
  filterSelect: "TeamView_filterSelect",
  compact: "TeamView_compact"
};

// packages/team/modules/ui/lib/types/client/ProjectPlanView.js
var roles = {
  planning_adviser: "view.function.planningAdviser",
  quality_adviser: "view.function.qualityAdviser",
  domain_adviser: "view.function.domainAdviser",
  group_lead: "view.function.groupLead",
  executor: "view.function.executor",
  verifier: "view.function.verifier"
};
function ProjectPlanView({ text: text2, t }) {
  let plan;
  try {
    plan = readProjectPlan(text2);
  } catch (error) {
    if (!(error instanceof Error))
      throw error;
    return (0, import_jsx_runtime3.jsx)("pre", { className: TeamView_default.preservedText, children: text2 });
  }
  if (plan === void 0)
    return (0, import_jsx_runtime3.jsx)("p", { className: TeamView_default.preservedText, children: text2 });
  return (0, import_jsx_runtime3.jsxs)("div", { className: TeamView_default.preservedText, children: [plan.automation !== void 0 && (0, import_jsx_runtime3.jsxs)("p", { children: [t("plan.automation"), ": ", t(plan.automation.provision === "on-demand" ? "plan.onDemand" : "plan.manual")] }), (0, import_jsx_runtime3.jsx)("h4", { children: t("plan.roster") }), (0, import_jsx_runtime3.jsx)("p", { className: TeamView_default.hint, children: t("plan.rosterHint") }), (0, import_jsx_runtime3.jsx)("ul", { children: plan.members.map((member) => (0, import_jsx_runtime3.jsxs)("li", { children: [(0, import_jsx_runtime3.jsx)("strong", { children: member.name }), " \xB7 ", t(roles[member.function]), " \xB7 ", member.parent, (0, import_jsx_runtime3.jsxs)("p", { children: [member.modelProvider, " / ", member.model, " / ", member.reasoningEffort] }), (0, import_jsx_runtime3.jsx)("p", { children: member.responsibility }), (0, import_jsx_runtime3.jsxs)("p", { children: [t("plan.skills"), ": ", member.skills.join(", ") || t("memory.none")] }), member.persona !== void 0 && (0, import_jsx_runtime3.jsxs)("details", { children: [(0, import_jsx_runtime3.jsx)("summary", { children: t("view.persona") }), (0, import_jsx_runtime3.jsx)("p", { children: member.persona })] }), member.instructions !== void 0 && (0, import_jsx_runtime3.jsxs)("details", { children: [(0, import_jsx_runtime3.jsx)("summary", { children: t("roles.instructions") }), (0, import_jsx_runtime3.jsx)("p", { children: member.instructions })] })] }, member.name)) }), (0, import_jsx_runtime3.jsx)("h4", { children: t("tasks") }), plan.tasks.map((task) => (0, import_jsx_runtime3.jsxs)("details", { open: true, children: [(0, import_jsx_runtime3.jsxs)("summary", { children: [task.id, " \xB7 ", task.description] }), (0, import_jsx_runtime3.jsxs)("p", { children: [t("plan.owner"), ": ", task.owner, " \xB7 ", t("plan.reviewer"), ": ", task.reviewer] }), (0, import_jsx_runtime3.jsxs)("p", { children: [t("plan.dependencies"), ": ", task.dependencies.join(", ") || t("plan.none")] }), (0, import_jsx_runtime3.jsxs)("p", { children: [t("plan.inputs"), ": ", task.inputs.join(", ") || t("plan.none")] }), (0, import_jsx_runtime3.jsxs)("p", { children: [t("plan.outputs"), ": ", task.outputs.join(", ") || t("plan.none")] }), task.exclusiveResources !== void 0 && (0, import_jsx_runtime3.jsxs)("p", { children: [t("plan.resources"), ": ", task.exclusiveResources.join(", ") || t("plan.none")] }), (0, import_jsx_runtime3.jsx)("p", { children: task.critical ? t("plan.dual") : t("plan.independent") }), (0, import_jsx_runtime3.jsx)("ol", { children: task.acceptanceCriteria.map((criterion, index) => (0, import_jsx_runtime3.jsx)("li", { children: criterion }, index)) })] }, task.id)), (0, import_jsx_runtime3.jsx)("h4", { children: t("plan.budget") }), (0, import_jsx_runtime3.jsxs)("p", { children: [t("plan.members"), ": ", plan.resources.maxMembers, " \xB7 ", t("plan.requests"), ": ", plan.resources.maxConcurrentRequests] }), (0, import_jsx_runtime3.jsx)("h4", { children: t("plan.recovery") }), (0, import_jsx_runtime3.jsx)("p", { children: plan.recovery }), plan.previousTasks.length > 0 && (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [(0, import_jsx_runtime3.jsx)("h4", { children: t("plan.previous") }), (0, import_jsx_runtime3.jsx)("ul", { children: plan.previousTasks.map((task) => (0, import_jsx_runtime3.jsxs)("li", { children: [task.id, " \xB7 ", t(task.action === "retain_history" ? "plan.retain" : "plan.replan"), " \xB7 ", task.reason] }, task.id)) })] })] });
}

// packages/team/modules/ui/lib/types/client/TeamRoles.js
var import_jsx_runtime4 = require("react/jsx-runtime");
var import_react = require("react");
var roleFields = [
  "description",
  "persona",
  "instructions",
  "modelProvider",
  "model",
  "reasoningEffort"
];
function sameRole(left, right) {
  return roleFields.every((field) => left[field] === right[field]);
}
function mergeRole(base, draft, incoming) {
  const value = (field) => draft[field] === base[field] ? incoming[field] : draft[field];
  const modelProvider = value("modelProvider");
  const model = value("model");
  const reasoningEffort = value("reasoningEffort");
  return {
    description: value("description") ?? "",
    persona: value("persona") ?? "",
    instructions: value("instructions") ?? "",
    ...modelProvider === void 0 ? {} : { modelProvider },
    ...model === void 0 ? {} : { model },
    ...reasoningEffort === void 0 ? {} : { reasoningEffort }
  };
}
function mergeProfiles(base, draft, incoming) {
  const merged = { ...incoming };
  for (const [id, previous] of Object.entries(base)) {
    const edited = draft[id];
    if (edited === void 0) {
      Reflect.deleteProperty(merged, id);
      continue;
    }
    const latest = incoming[id];
    if (latest === void 0) {
      if (!sameRole(previous, edited))
        merged[id] = edited;
      continue;
    }
    merged[id] = mergeRole(previous, edited, latest);
  }
  for (const [id, edited] of Object.entries(draft))
    if (base[id] === void 0)
      merged[id] = edited;
  return merged;
}
function TeamRoles({ operations, t }) {
  const [settings, setSettings] = (0, import_react.useState)(null);
  const [profiles, setProfiles] = (0, import_react.useState)({});
  const [selected, setSelected] = (0, import_react.useState)("");
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [saved, setSaved] = (0, import_react.useState)(false);
  const [dirty, setDirty] = (0, import_react.useState)(false);
  const draftRevision = (0, import_react.useRef)(0);
  (0, import_react.useEffect)(() => {
    let disposed = false;
    void operations.loadRoles().then((value) => {
      if (disposed)
        return;
      setSettings(value);
      setProfiles(value.profiles);
      setSelected(Object.keys(value.profiles)[0] ?? "");
      setDirty(false);
    }).catch((reason) => {
      if (!disposed)
        setError(String(reason));
    });
    return () => {
      disposed = true;
    };
  }, [operations]);
  const profile = profiles[selected];
  const provider = settings?.catalog.groups.find((group) => group.id === profile?.modelProvider);
  const model = provider?.models.find((candidate) => candidate.id === profile?.model);
  const update = (next) => {
    draftRevision.current += 1;
    setProfiles((current) => ({ ...current, [selected]: next }));
    setDirty(true);
    setSaved(false);
  };
  const reload = async () => {
    if (settings === null)
      return;
    setBusy(true);
    try {
      const latest = await operations.loadRoles();
      setProfiles((current) => mergeProfiles(settings.profiles, current, latest.profiles));
      setSettings(latest);
      setError(null);
      setSaved(false);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (settings === null)
      return;
    setError(null);
    for (const [id, candidate] of Object.entries(profiles)) {
      const route = settings.catalog.groups.find((group) => group.id === candidate.modelProvider);
      const choice = route?.models.find((item) => item.id === candidate.model);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id) || candidate.description.trim() === "" || candidate.persona.trim() === "") {
        setError(t("roles.invalid"));
        return;
      }
      if ((candidate.modelProvider !== void 0 || candidate.model !== void 0) && choice === void 0) {
        setError(t("roles.invalidModel"));
        return;
      }
      if (candidate.reasoningEffort !== void 0 && !choice?.reasoning?.efforts.some((effort) => effort.id === candidate.reasoningEffort)) {
        setError(t("roles.invalidEffort"));
        return;
      }
    }
    setBusy(true);
    const savingRevision = draftRevision.current;
    try {
      const revision = await operations.saveRoles(profiles, settings.revision);
      setSettings({ ...settings, revision, profiles });
      setSaved(draftRevision.current === savingRevision);
      if (draftRevision.current === savingRevision)
        setDirty(false);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };
  return (0, import_jsx_runtime4.jsxs)("section", { className: TeamAction_default.roles, children: [(0, import_jsx_runtime4.jsx)("h3", { children: t("roles.templates") }), (0, import_jsx_runtime4.jsx)("p", { className: TeamAction_default.sectionHint, children: t("roles.hint") }), error !== null && (0, import_jsx_runtime4.jsx)("p", { className: TeamAction_default.error, role: "alert", children: error }), settings === null && error === null && (0, import_jsx_runtime4.jsx)("p", { role: "status", children: t("loading") }), settings !== null && (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [settings.catalog.failures.map((failure) => (0, import_jsx_runtime4.jsxs)("p", { className: TeamAction_default.warning, children: [failure.name, ": ", failure.message] }, failure.id)), (0, import_jsx_runtime4.jsxs)("div", { className: TeamAction_default.roleColumns, children: [(0, import_jsx_runtime4.jsxs)("div", { className: TeamAction_default.roleList, children: [Object.entries(profiles).map(([id, value]) => (0, import_jsx_runtime4.jsxs)("button", { type: "button", className: id === selected ? `${TeamAction_default.roleChoice} ${TeamAction_default.roleSelected}` : TeamAction_default.roleChoice, onClick: () => {
    setSelected(id);
  }, children: [(0, import_jsx_runtime4.jsx)("strong", { children: id }), (0, import_jsx_runtime4.jsx)("span", { children: value.description }), (0, import_jsx_runtime4.jsx)("small", { children: value.model ?? t("roles.inherit") })] }, id)), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: TeamAction_default.secondaryButton, onClick: () => {
    let number = Object.keys(profiles).length + 1;
    while (profiles[`member-${number}`] !== void 0)
      number += 1;
    const id = `member-${number}`;
    draftRevision.current += 1;
    setProfiles((current) => ({ ...current, [id]: { description: "", persona: "", instructions: "" } }));
    setSelected(id);
    setSaved(false);
    setDirty(true);
  }, children: t("roles.add") })] }), profile !== void 0 && (0, import_jsx_runtime4.jsxs)("div", { className: TeamAction_default.roleForm, children: [(0, import_jsx_runtime4.jsxs)("div", { className: TeamAction_default.roleFormHeader, children: [(0, import_jsx_runtime4.jsx)("strong", { children: selected }), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: TeamAction_default.textButton, onClick: () => {
    const next = Object.fromEntries(Object.entries(profiles).filter(([id]) => id !== selected));
    draftRevision.current += 1;
    setProfiles(next);
    setSelected(Object.keys(next)[0] ?? "");
    setSaved(false);
    setDirty(true);
  }, children: t("roles.remove") })] }), (0, import_jsx_runtime4.jsxs)("label", { children: [t("roles.description"), (0, import_jsx_runtime4.jsx)("input", { value: profile.description, onChange: (event) => {
    update({ ...profile, description: event.target.value });
  } })] }), (0, import_jsx_runtime4.jsxs)("div", { className: TeamAction_default.modelFields, children: [(0, import_jsx_runtime4.jsxs)("label", { children: [t("roles.provider"), (0, import_jsx_runtime4.jsxs)("select", { value: profile.modelProvider ?? "", onChange: (event) => {
    const group = settings.catalog.groups.find((candidate) => candidate.id === event.target.value);
    const { modelProvider: _provider, model: _model, reasoningEffort: _effort, ...role } = profile;
    update({ ...role, ...group?.models[0] === void 0 ? {} : { modelProvider: group.id, model: group.models[0].id } });
  }, children: [(0, import_jsx_runtime4.jsx)("option", { value: "", children: t("roles.inherit") }), settings.catalog.groups.map((group) => (0, import_jsx_runtime4.jsx)("option", { value: group.id, children: group.name }, group.id))] })] }), (0, import_jsx_runtime4.jsxs)("label", { children: [t("model"), (0, import_jsx_runtime4.jsx)("select", { value: profile.model ?? "", disabled: provider === void 0, onChange: (event) => {
    const { reasoningEffort: _effort, ...role } = profile;
    update({ ...role, model: event.target.value });
  }, children: provider === void 0 ? (0, import_jsx_runtime4.jsx)("option", { value: "", children: t("roles.inherit") }) : provider.models.map((value) => (0, import_jsx_runtime4.jsx)("option", { value: value.id, children: value.name }, value.id)) })] }), (0, import_jsx_runtime4.jsxs)("label", { children: [t("reasoningEffort"), (0, import_jsx_runtime4.jsxs)("select", { value: profile.reasoningEffort ?? "", disabled: model?.reasoning === void 0, onChange: (event) => {
    const { reasoningEffort: _effort, ...role } = profile;
    update(event.target.value === "" ? role : { ...role, reasoningEffort: event.target.value });
  }, children: [(0, import_jsx_runtime4.jsx)("option", { value: "", children: t(model?.reasoning === void 0 ? "roles.noEffort" : "roles.defaultEffort") }), model?.reasoning?.efforts.map((effort) => (0, import_jsx_runtime4.jsx)("option", { value: effort.id, children: effort.name }, effort.id))] })] })] }), (0, import_jsx_runtime4.jsxs)("label", { children: [t("roles.persona"), (0, import_jsx_runtime4.jsx)("textarea", { rows: 5, value: profile.persona, onChange: (event) => {
    update({ ...profile, persona: event.target.value });
  } })] }), (0, import_jsx_runtime4.jsxs)("label", { children: [t("roles.instructions"), (0, import_jsx_runtime4.jsx)("textarea", { rows: 8, className: TeamAction_default.instructions, value: profile.instructions, onChange: (event) => {
    update({ ...profile, instructions: event.target.value });
  } })] })] })] }), (0, import_jsx_runtime4.jsxs)("div", { className: TeamAction_default.editorFooter, children: [(0, import_jsx_runtime4.jsx)("span", { role: "status", children: saved ? t("roles.saved") : dirty ? t("roles.unsaved") : t("roles.persisted") }), error !== null && (0, import_jsx_runtime4.jsx)("button", { type: "button", className: TeamAction_default.secondaryButton, disabled: busy, onClick: () => {
    void reload();
  }, children: t("roles.reload") }), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: TeamAction_default.primaryButton, disabled: busy, onClick: () => {
    void save();
  }, children: t(busy ? "roles.saving" : "roles.save") })] })] })] });
}

// packages/team/modules/ui/lib/types/client/CurrentTeamRoles.js
var import_jsx_runtime5 = require("react/jsx-runtime");

// packages/team/modules/ui/lib/types/client/team-view-data.js
function memberFunctionKey(member) {
  switch (member.teamFunction) {
    case "planning_adviser":
      return "view.function.planningAdviser";
    case "quality_adviser":
      return "view.function.qualityAdviser";
    case "domain_adviser":
      return "view.function.domainAdviser";
    case "group_lead":
      return "view.function.groupLead";
    case "executor":
      return "view.function.executor";
    case "verifier":
      return "view.function.verifier";
    default:
      return member.expert === void 0 ? "view.longTermMember" : "view.boundExpert";
  }
}
var displayed = /* @__PURE__ */ new WeakMap();
function withLegacyMembers(state, team) {
  const catalogs = [];
  const members = [...team.members];
  const seen = new Set(members.map((member) => member.id));
  for (const parent of members) {
    const children = state.projectionsBySession[parent.id]?.values.subagentCatalog;
    catalogs.push(children);
    for (const child of children ?? []) {
      if (child.mode === "external")
        continue;
      if (seen.has(child.id))
        continue;
      seen.add(child.id);
      members.push({
        id: child.id,
        name: child.label ?? child.id,
        parentId: parent.id,
        role: "teammate",
        phase: "active",
        legacyMode: child.mode
      });
    }
  }
  const cached = displayed.get(team);
  if (cached !== void 0 && cached.catalogs.length === catalogs.length && catalogs.every((value, index) => value === cached.catalogs[index]))
    return cached.value;
  const result = members.length === team.members.length ? team : { ...team, members };
  displayed.set(team, { catalogs, value: result });
  return result;
}
function memberModelDisplay(member, selection) {
  if (member.modelRouteRevision !== void 0) {
    const recorded2 = selection?.lastUsed;
    const upcoming2 = member.modelProvider === void 0 || member.model === void 0 ? void 0 : {
      provider: member.modelProvider,
      model: member.model,
      ...member.reasoningEffort === void 0 ? {} : { reasoningEffort: member.reasoningEffort }
    };
    return {
      ...recorded2?.model === void 0 ? member.model === void 0 ? {} : { model: member.model } : { model: recorded2.model },
      ...(recorded2 ?? member).reasoningEffort === void 0 ? {} : { reasoningEffort: (recorded2 ?? member).reasoningEffort },
      source: recorded2 == null ? "next" : "recorded",
      ...recorded2 == null || upcoming2 === void 0 || recorded2.provider === upcoming2.provider && recorded2.model === upcoming2.model && recorded2.reasoningEffort === upcoming2.reasoningEffort ? {} : { next: upcoming2 }
    };
  }
  const recorded = selection?.lastUsed ?? null;
  const next = selection?.next ?? null;
  const primary = recorded ?? next;
  const model = primary?.model ?? member.model;
  const reasoningEffort = primary === null ? member.reasoningEffort : primary.reasoningEffort;
  const upcoming = recorded !== null && next !== null && (recorded.provider !== next.provider || recorded.model !== next.model || recorded.reasoningEffort !== next.reasoningEffort) ? next : void 0;
  return {
    ...model === void 0 ? {} : { model },
    ...reasoningEffort === void 0 ? {} : { reasoningEffort },
    source: recorded !== null ? "recorded" : next !== null ? "next" : "bound",
    ...upcoming === void 0 ? {} : { next: upcoming }
  };
}
function selectTeam(state, sessionId, parentId) {
  const projections = Object.entries(state.projectionsBySession);
  let id = sessionId;
  const seen = /* @__PURE__ */ new Set();
  let fallback;
  while (!seen.has(id)) {
    seen.add(id);
    const own = state.projectionsBySession[id]?.values.agentTeam;
    for (const [, projection] of projections) {
      const team = projection.values.agentTeam;
      if (team?.members.some((member) => member.id === id && member.role === "teammate"))
        return withLegacyMembers(state, team);
    }
    if (own !== void 0)
      fallback = own;
    const catalogParent = projections.find(([, projection]) => projection.values.subagentCatalog?.some((child) => child.id === id))?.[0];
    const next = id === sessionId && parentId !== void 0 ? parentId : catalogParent;
    if (next === void 0)
      break;
    id = next;
  }
  return fallback === void 0 ? void 0 : withLegacyMembers(state, fallback);
}
function teamHierarchy(members) {
  const lead = members.find((member) => member.role === "lead");
  const children = /* @__PURE__ */ new Map();
  for (const member of members) {
    const parentId = member.parentId ?? lead?.id;
    if (member.role !== "teammate" || parentId === void 0)
      continue;
    const siblings = children.get(parentId) ?? [];
    siblings.push(member);
    children.set(parentId, siblings);
  }
  const rank = (member) => member.legacyMode !== void 0 ? 7 : member.teamFunction === "planning_adviser" ? 0 : member.teamFunction === "quality_adviser" ? 1 : member.teamFunction === "domain_adviser" ? 2 : member.teamFunction === "group_lead" ? 3 : member.teamFunction === "verifier" ? 5 : 4;
  for (const siblings of children.values())
    siblings.sort((left, right) => rank(left) - rank(right));
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (member, depth) => {
    if (seen.has(member.id))
      return;
    seen.add(member.id);
    result.push({ member, depth });
    for (const child of children.get(member.id) ?? [])
      visit(child, depth + 1);
  };
  if (lead !== void 0)
    visit(lead, 0);
  for (const member of members)
    if (!seen.has(member.id))
      visit(member, 0);
  return result;
}
function teamWorkGroups(members, tasks) {
  const lead = members.find((member) => member.role === "lead");
  const byId = new Map(members.map((member) => [member.id, member]));
  const byName = new Map(members.map((member) => [member.name, member]));
  const groupId = (member) => {
    if (member === lead)
      return "lead";
    let current = member;
    const seen = /* @__PURE__ */ new Set();
    while (current.parentId !== void 0 && current.parentId !== lead?.id && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = byId.get(current.parentId);
      if (parent === void 0)
        break;
      current = parent;
    }
    return current.id;
  };
  const groups = /* @__PURE__ */ new Map();
  for (const member of members) {
    const id = groupId(member);
    const group = groups.get(id) ?? { leader: id === "lead" ? void 0 : byId.get(id), members: [], tasks: [] };
    group.members.push(member);
    groups.set(id, group);
  }
  for (const task of tasks) {
    const owner = task.ownerName === void 0 ? void 0 : byName.get(task.ownerName);
    const id = owner === void 0 ? "unassigned" : groupId(owner);
    const group = groups.get(id) ?? { leader: void 0, members: [], tasks: [] };
    group.tasks.push(task);
    groups.set(id, group);
  }
  return [...groups].filter(([, group]) => group.tasks.length > 0 || group.leader !== void 0).map(([id, group]) => ({
    id,
    ...group.leader === void 0 ? {} : { leader: group.leader },
    members: group.members,
    tasks: group.tasks
  }));
}
function memberSection(member) {
  if (member.legacyMode !== void 0)
    return "legacy";
  if (member.role === "lead" || member.teamFunction?.endsWith("_adviser"))
    return "coordination";
  return member.expert === void 0 ? "execution" : "experts";
}
function memberActivity(member, running, summary, pending) {
  if (member.phase !== "active")
    return member.phase;
  if (pending)
    return "needsInput";
  const value = running ?? summary;
  return value === void 0 ? "unknown" : value ? "running" : "inactive";
}

// packages/team/modules/ui/lib/types/client/CurrentTeamRoles.module.css
var CurrentTeamRoles_default = {
  current: "CurrentTeamRoles_current",
  planned: "CurrentTeamRoles_planned",
  member: "CurrentTeamRoles_member",
  route: "CurrentTeamRoles_route"
};

// packages/team/modules/ui/lib/types/client/CurrentTeamRoles.js
function CurrentRole({ member, depth, useSessions, t }) {
  const selection = useSessions((state) => state.projectionsBySession[member.id]?.values.modelSelection);
  const model = memberModelDisplay(member, selection);
  return (0, import_jsx_runtime5.jsxs)("li", { className: CurrentTeamRoles_default.member, style: { marginInlineStart: `${Math.min(Math.max(depth - 1, 0), 4) * 12}px` }, children: [(0, import_jsx_runtime5.jsxs)("div", { children: [(0, import_jsx_runtime5.jsx)("strong", { children: member.expert?.name ?? member.name }), member.role !== "lead" && (0, import_jsx_runtime5.jsx)("small", { children: t(memberFunctionKey(member)) }), (0, import_jsx_runtime5.jsx)("span", { children: member.description })] }), (0, import_jsx_runtime5.jsxs)("div", { className: CurrentTeamRoles_default.route, children: [(0, import_jsx_runtime5.jsx)("span", { children: model.model ?? t("view.sessionModel") }), (0, import_jsx_runtime5.jsx)("small", { children: model.reasoningEffort ?? t("roles.defaultEffort") })] })] });
}
function CurrentTeamRoles({ members, plannedTeam, useSessions, t }) {
  return (0, import_jsx_runtime5.jsxs)("section", { className: CurrentTeamRoles_default.current, "aria-label": t("roles.currentTeam"), children: [(0, import_jsx_runtime5.jsxs)("header", { children: [(0, import_jsx_runtime5.jsx)("h3", { children: t("roles.currentTeam") }), (0, import_jsx_runtime5.jsx)("small", { children: members.length })] }), plannedTeam !== void 0 && (0, import_jsx_runtime5.jsxs)("div", { className: CurrentTeamRoles_default.planned, children: [(0, import_jsx_runtime5.jsx)("h4", { children: t("roles.plannedTeam") }), (0, import_jsx_runtime5.jsx)(ProjectPlanView, { text: plannedTeam, t })] }), members.length === 0 ? (0, import_jsx_runtime5.jsx)("p", { children: t("roles.noCurrentTeam") }) : (0, import_jsx_runtime5.jsx)("ul", { children: teamHierarchy(members).map(({ member, depth }) => (0, import_jsx_runtime5.jsx)(CurrentRole, { member, depth, useSessions, t }, member.id)) })] });
}

// packages/team/modules/ui/lib/types/client/team-projection-recovery.js
var import_react2 = require("react");
function useTeamProjectionRecovery(sessionId, active, missing, refresh) {
  const [state, setState] = (0, import_react2.useState)("idle");
  const generation = (0, import_react2.useRef)(0);
  (0, import_react2.useEffect)(() => () => {
    generation.current++;
  }, []);
  (0, import_react2.useEffect)(() => {
    if (!active || !missing)
      return;
    const current = ++generation.current;
    setState("loading");
    void refresh(sessionId).then(() => {
      if (generation.current === current)
        setState("settled");
    }, () => {
      if (generation.current === current)
        setState("error");
    });
    return () => {
      if (generation.current === current)
        generation.current++;
    };
  }, [active, missing, refresh, sessionId]);
  const retry = () => {
    if (state === "loading")
      return;
    const current = ++generation.current;
    setState("loading");
    void refresh(sessionId, true).then(() => {
      if (generation.current === current)
        setState("settled");
    }, () => {
      if (generation.current === current)
        setState("error");
    });
  };
  return { state, retry };
}

// packages/team/modules/ui/lib/types/client/TeamAction.js
function statusKey(status) {
  switch (status) {
    case "pending":
      return "status.pending";
    case "in_progress":
      return "status.in_progress";
    case "completed":
      return "status.completed";
    /* v8 ignore next -- Team views omit deleted task tombstones. */
    case "deleted":
      return "status.completed";
  }
}
function memberStatusKey(status) {
  switch (status) {
    case "running":
      return "memberStatus.running";
    case "unknown":
      return "memberStatus.unknown";
    case "inactive":
      return "memberStatus.inactive";
    case "needsInput":
      return "memberStatus.needsInput";
    case "provisioning":
      return "memberStatus.provisioning";
    case "failed":
      return "memberStatus.failed";
    case "retired":
      return "memberStatus.retired";
  }
}
function memberDotState(status) {
  switch (status) {
    case "running":
    case "provisioning":
      return "ongoing";
    case "needsInput":
      return "warning";
    case "failed":
      return "error";
    case "unknown":
    case "retired":
      return "idle";
  }
}
function taskDotState(task, ownerRunning) {
  switch (task.status) {
    case "pending":
      return task.ready ? "idle" : "warning";
    case "in_progress":
      return task.work?.execution?.phase === "submitted" ? "warning" : ownerRunning === true ? "ongoing" : "warning";
    case "completed":
      return "done";
    /* v8 ignore next -- Team views omit deleted task tombstones. */
    case "deleted":
      return "idle";
  }
}
function TeamMemberRow({ member, memberCount, parentName, depth, sessionId, useSessions, useSessionStatus, openTeammate, onSelect, onError, t }) {
  const selection = useSessions((state) => state.projectionsBySession[member.id]?.values.modelSelection);
  const model = memberModelDisplay(member, selection);
  const running = useSessionStatus((state) => state.get(member.id)?.running);
  const pendingInteraction = useSessionStatus((state) => state.get(member.id)?.pendingInteraction);
  const summaryRunning = useSessions((state) => state.byId[member.id]?.running);
  const status = memberActivity(member, running, summaryRunning, pendingInteraction !== void 0);
  const isCurrent = member.id === sessionId;
  const highlightCurrent = isCurrent && memberCount > 1;
  const inert = isCurrent;
  return (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.Tooltip, { label: status === "failed" || status === "provisioning" ? t("workspace.inspect") : t("open"), side: "bottom", gap: 4, disabled: inert, children: (0, import_jsx_runtime6.jsxs)("button", { type: "button", className: highlightCurrent ? `${TeamAction_default.member} ${TeamAction_default.memberCurrent}` : TeamAction_default.member, style: depth > 1 ? { marginInlineStart: `${Math.min(depth - 1, 4) * 14}px`, width: `calc(100% - ${Math.min(depth - 1, 4) * 14}px)` } : void 0, disabled: inert, onClick: () => {
    onSelect(member.id);
    if (status === "failed" || status === "provisioning")
      return;
    try {
      openTeammate(sessionId, member.id);
    } catch (reason) {
      onError(String(reason));
    }
  }, children: [(0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.memberDot, children: status === "inactive" ? (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.IconUserOutlineRegular, { size: 14, className: TeamAction_default.inactiveIcon }) : (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.StateDot, { state: memberDotState(status) }) }), (0, import_jsx_runtime6.jsxs)("span", { className: TeamAction_default.memberText, children: [(0, import_jsx_runtime6.jsxs)("span", { className: TeamAction_default.memberName, children: [(0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.memberNameText, children: member.name }), isCurrent && (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.Tag, { tone: "info", className: TeamAction_default.currentTag, children: t("current") })] }), parentName !== void 0 && (0, import_jsx_runtime6.jsxs)("small", { children: [t("parent"), ": ", parentName] }), member.role !== "lead" && (0, import_jsx_runtime6.jsx)("small", { children: t(memberFunctionKey(member)) }), member.description !== void 0 && (0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.memberDescription, children: member.description }), (0, import_jsx_runtime6.jsxs)("small", { children: [t(memberStatusKey(status)), model.model !== void 0 && (0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.memberModel, children: ` \xB7 ${t("model")}: ${model.model} (${t(`view.modelSource.${model.source}`)})` })] }), (model.model !== void 0 || member.persona !== void 0) && (0, import_jsx_runtime6.jsxs)("span", { className: TeamAction_default.memberConfiguration, children: [model.model !== void 0 && (0, import_jsx_runtime6.jsxs)("span", { children: [t("reasoningEffort"), ": ", model.reasoningEffort ?? t("roles.defaultEffort")] }), model.next !== void 0 && (0, import_jsx_runtime6.jsxs)("span", { children: [t("view.nextModel", { model: model.next.model }), " \xB7 ", t("view.nextEffort", { effort: model.next.reasoningEffort ?? t("roles.defaultEffort") })] }), member.persona !== void 0 && (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.Tooltip, { label: member.persona, side: "bottom", gap: 4, children: (0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.personaTag, children: t("personaBound") }) })] }), member.error !== void 0 && (0, import_jsx_runtime6.jsx)("small", { className: TeamAction_default.diagnostic, children: member.error })] })] }) });
}
function TaskCard({ task, ownerRunning, currentGoalRevision, duplicate, onSelect, t }) {
  const [expanded, setExpanded] = (0, import_react3.useState)(false);
  const [clamped, setClamped] = (0, import_react3.useState)(false);
  const textRef = (0, import_react3.useRef)(null);
  (0, import_react3.useLayoutEffect)(() => {
    if (expanded)
      return;
    const paragraph = textRef.current;
    if (paragraph === null)
      return;
    const measure = () => {
      setClamped(paragraph.scrollHeight > paragraph.clientHeight + 1);
    };
    measure();
    if (typeof ResizeObserver === "undefined")
      return;
    const observer = new ResizeObserver(measure);
    observer.observe(paragraph);
    return () => {
      observer.disconnect();
    };
  }, [task.description, expanded]);
  return (0, import_jsx_runtime6.jsxs)("article", { className: TeamAction_default.task, children: [(0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.taskTitle, children: [(0, import_jsx_runtime6.jsx)("button", { type: "button", className: TeamAction_default.taskSelect, onClick: () => {
    onSelect(task.id);
  }, children: task.subject }), (0, import_jsx_runtime6.jsxs)("span", { className: TeamAction_default.taskState, children: [(0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.StateDot, { state: taskDotState(task, ownerRunning) }), (0, import_jsx_runtime6.jsx)("span", { children: t(taskWorkStateKey(task, ownerRunning, currentGoalRevision) ?? statusKey(task.status)) })] })] }), (0, import_jsx_runtime6.jsx)("p", { ref: textRef, className: expanded ? void 0 : TeamAction_default.clampedDescription, children: task.description }), task.result !== void 0 && (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.taskResult, children: [(0, import_jsx_runtime6.jsx)("strong", { children: t(task.validity.reusable ? "task.result" : "task.recordedResult") }), (0, import_jsx_runtime6.jsx)("p", { children: task.result })] }), (0, import_jsx_runtime6.jsx)(TaskWorkDetails, { task, t }), task.evidence !== void 0 && task.evidence.length > 0 && (0, import_jsx_runtime6.jsxs)("details", { className: TeamAction_default.evidence, children: [(0, import_jsx_runtime6.jsx)("summary", { children: t("task.evidence") }), (0, import_jsx_runtime6.jsx)("ul", { children: task.evidence.map((value, index) => (0, import_jsx_runtime6.jsx)("li", { children: value }, index)) })] }), (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.meta, children: [(clamped || expanded) && (0, import_jsx_runtime6.jsxs)("button", { type: "button", className: TeamAction_default.expandToggle, "aria-expanded": expanded, onClick: () => {
    setExpanded((current) => !current);
  }, children: [t(expanded ? "task.collapse" : "task.expand"), (0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12, className: expanded ? TeamAction_default.expandToggleOpen : void 0 })] }), (0, import_jsx_runtime6.jsx)("span", { children: task.id }), duplicate && (0, import_jsx_runtime6.jsx)("span", { children: t("work.duplicateSubject") }), (0, import_jsx_runtime6.jsxs)("span", { children: [t("owner"), ": ", task.ownerName ?? t("unowned")] }), task.status === "pending" && (0, import_jsx_runtime6.jsx)("span", { children: task.ready ? t("ready") : t("blocked") }), task.blockedBy.length > 0 && (0, import_jsx_runtime6.jsxs)("span", { children: [t("blockedBy"), ": ", task.blockedBy.join(", ")] }), task.writeScopes.length > 0 && (0, import_jsx_runtime6.jsxs)("span", { children: [t("writeScopes"), ": ", task.writeScopes.join(", ")] }), task.writeScopeWarnings.map((warning) => (0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.warning, children: warning }, warning))] })] });
}
function TeamAction({ sessionId, useSession, useSessions, useSessionStatus, openTeammate, refreshTeam, roles: roles2, t, useRecoveredTeam = () => void 0 }) {
  const [open, setOpen] = (0, import_react3.useState)(false);
  const [error, setError] = (0, import_react3.useState)(null);
  const [tab, setTab] = (0, import_react3.useState)("overview");
  const [selectedMemberId, setSelectedMemberId] = (0, import_react3.useState)(null);
  const [selectedTaskId, setSelectedTaskId] = (0, import_react3.useState)(null);
  const rootRef = (0, import_react3.useRef)(null);
  const triggerRef = (0, import_react3.useRef)(null);
  const triggerLabelRef = (0, import_react3.useRef)(null);
  const panelRef = (0, import_react3.useRef)(null);
  const position = (0, import_dsh_client_ui_primitives.useAnchoredPosition)({
    open,
    anchorRef: triggerRef,
    panelRef,
    gap: 5,
    margin: 16
  });
  const positioned = position !== null;
  const parentSessionId = useSession((snapshot) => snapshot.subagent?.address.parentSessionId);
  const recoveredTeam = useRecoveredTeam(sessionId);
  const team = useSessions((state) => selectTeam(state, sessionId, parentSessionId)) ?? recoveredTeam;
  const pendingGoalReview = useSessionStatus((state) => state.get(team?.members.find((member) => member.role === "lead")?.id ?? sessionId)?.pendingInteraction?.kind === "plan-review");
  const taskActivities = useTaskActivities(team, useSessions, useSessionStatus);
  const duplicateSubjects = duplicateTaskSubjects(team?.tasks ?? []);
  const recovery = useTeamProjectionRecovery(sessionId, open, team === void 0, refreshTeam);
  const opening = useSession((snapshot) => snapshot.openState === "loading");
  const listing = useSessions((state) => state.phase === "pending");
  const hoverTimer = (0, import_react3.useRef)(void 0);
  const pinnedRef = (0, import_react3.useRef)(false);
  const cancelHoverChange = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = void 0;
  };
  (0, import_react3.useEffect)(() => {
    cancelHoverChange();
    pinnedRef.current = false;
    setOpen(false);
    setError(null);
    setSelectedMemberId(null);
    setSelectedTaskId(null);
  }, [sessionId]);
  (0, import_react3.useEffect)(() => cancelHoverChange, []);
  (0, import_react3.useEffect)(() => {
    if (pendingGoalReview) {
      cancelHoverChange();
      pinnedRef.current = false;
      setOpen(false);
    }
  }, [pendingGoalReview]);
  (0, import_react3.useLayoutEffect)(() => {
    if (open && positioned && pinnedRef.current)
      panelRef.current?.focus();
  }, [open, positioned]);
  const changeOpen = (next) => {
    cancelHoverChange();
    if (!next)
      pinnedRef.current = false;
    setOpen(next);
  };
  const scheduleHoverOpen = () => {
    cancelHoverChange();
    if (open)
      return;
    const label = triggerLabelRef.current;
    if (label === null)
      return;
    if (getComputedStyle(label).display === "none")
      return;
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = void 0;
      changeOpen(true);
    }, 150);
  };
  const scheduleHoverClose = () => {
    cancelHoverChange();
    if (pinnedRef.current)
      return;
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = void 0;
      changeOpen(false);
    }, 120);
  };
  (0, import_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, changeOpen, panelRef);
  (0, import_react3.useEffect)(() => {
    if (!open)
      return;
    const dismiss = (event) => {
      if (event.key !== "Escape")
        return;
      event.preventDefault();
      cancelHoverChange();
      pinnedRef.current = false;
      setOpen(false);
      if (panelRef.current?.contains(document.activeElement))
        triggerRef.current?.focus();
    };
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
    };
  }, [open]);
  const compact = roles2 === void 0 && team !== void 0 && team.members.length === 1 && team.tasks.length === 0;
  const selectedMember = team?.members.find((member) => member.id === selectedMemberId) ?? team?.members.find((member) => member.role === "lead");
  const selectedTask = team?.tasks.find((task) => task.id === selectedTaskId);
  const selectedModelSelection = useSessions((state) => selectedMember === void 0 ? void 0 : state.projectionsBySession[selectedMember.id]?.values.modelSelection);
  const selectedModel = selectedMember === void 0 ? void 0 : memberModelDisplay(selectedMember, selectedModelSelection);
  const taskGroups = team === void 0 ? [] : teamWorkGroups(team.members, team.tasks);
  const pendingPlan = team?.goalProposal?.change.kind === "replace" && team.goalDecision?.proposalRevision !== team.goalProposal.revision ? team.goalProposal.change.definition : void 0;
  const displayedPlan = pendingPlan ?? team?.goal?.definition;
  return (0, import_jsx_runtime6.jsxs)("div", { ref: rootRef, className: TeamAction_default.root, "data-team-action": true, onMouseLeave: scheduleHoverClose, children: [(0, import_jsx_runtime6.jsxs)("button", { type: "button", ref: triggerRef, onMouseEnter: scheduleHoverOpen, className: TeamAction_default.trigger, "aria-label": t("trigger"), "aria-haspopup": "dialog", "aria-expanded": open, onClick: () => {
    cancelHoverChange();
    pinnedRef.current = true;
    if (!open)
      changeOpen(true);
    else
      panelRef.current?.focus();
  }, children: [(0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.IconUsersOutlineRegular, { size: 14 }), (0, import_jsx_runtime6.jsx)("span", { ref: triggerLabelRef, className: TeamAction_default.triggerLabel, children: t("trigger") })] }), open && (0, import_react_dom.createPortal)((0, import_jsx_runtime6.jsxs)("div", { ref: panelRef, className: roles2 !== void 0 ? `${TeamAction_default.panel} ${TeamAction_default.workspacePanel}` : compact ? `${TeamAction_default.panel} ${TeamAction_default.panelCompact}` : TeamAction_default.panel, style: position ?? { visibility: "hidden", left: 0, top: 0 }, role: "dialog", tabIndex: -1, "aria-label": t("trigger"), "data-team-panel": true, onMouseEnter: cancelHoverChange, onMouseLeave: scheduleHoverClose, children: [roles2 !== void 0 && (0, import_jsx_runtime6.jsxs)("header", { className: TeamAction_default.workspaceHeader, children: [(0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.eyebrow, children: t("workspace.eyebrow") }), (0, import_jsx_runtime6.jsx)("h2", { children: t("workspace.title") }), (0, import_jsx_runtime6.jsx)("p", { children: t("workspace.subtitle") })] }), (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.headerActions, children: [(0, import_jsx_runtime6.jsx)("button", { type: "button", className: TeamAction_default.secondaryButton, onClick: () => {
    setTab("plan");
    pinnedRef.current = true;
  }, children: t("workspace.plan") }), (0, import_jsx_runtime6.jsx)("button", { type: "button", className: TeamAction_default.secondaryButton, onClick: () => {
    changeOpen(false);
  }, children: t("workspace.close") })] })] }), roles2 !== void 0 && (0, import_jsx_runtime6.jsx)("nav", { className: TeamAction_default.tabs, "aria-label": t("workspace.navigation"), children: ["overview", "roles", "memory"].map((value) => (0, import_jsx_runtime6.jsx)("button", { type: "button", "aria-current": tab === value ? "page" : void 0, onClick: () => {
    pinnedRef.current = true;
    setTab(value);
  }, children: t(`workspace.${value}`) }, value)) }), (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.body, children: [roles2 !== void 0 && tab === "roles" && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)(CurrentTeamRoles, { members: team?.members ?? [], useSessions, t }), (0, import_jsx_runtime6.jsx)(TeamRoles, { operations: roles2, t })] }), roles2 !== void 0 && tab === "plan" && (0, import_jsx_runtime6.jsxs)("section", { className: TeamAction_default.plan, children: [(0, import_jsx_runtime6.jsx)("h3", { children: t("workspace.plan") }), displayedPlan === void 0 ? (0, import_jsx_runtime6.jsx)("p", { children: t("workspace.noPlan") }) : (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [pendingPlan !== void 0 && (0, import_jsx_runtime6.jsx)("p", { role: "status", children: t("goals.pending", { revision: team?.goalProposal?.revision ?? 0 }) }), (0, import_jsx_runtime6.jsx)("h4", { children: t("goals.objective") }), (0, import_jsx_runtime6.jsx)("p", { children: displayedPlan.objective }), (0, import_jsx_runtime6.jsx)("h4", { children: t("goals.plan") }), (0, import_jsx_runtime6.jsx)(ProjectPlanView, { text: displayedPlan.plan ?? t("workspace.noPlan"), t }), (0, import_jsx_runtime6.jsx)("h4", { children: t("goals.acceptanceCriteria") }), (0, import_jsx_runtime6.jsx)("ul", { children: displayedPlan.acceptanceCriteria.map((criterion, index) => (0, import_jsx_runtime6.jsx)("li", { children: criterion }, index)) }), (0, import_jsx_runtime6.jsx)("h4", { children: t("goals.coverage") }), (0, import_jsx_runtime6.jsx)("p", { children: t(`goals.coverage.${displayedPlan.scope.coverage}`) }), (0, import_jsx_runtime6.jsx)("h4", { children: t("goals.targets") }), (0, import_jsx_runtime6.jsx)("ul", { children: displayedPlan.scope.targets.map((target, index) => (0, import_jsx_runtime6.jsx)("li", { children: target }, index)) }), (0, import_jsx_runtime6.jsx)("h4", { children: t("goals.allowedActions") }), (0, import_jsx_runtime6.jsx)("ul", { children: displayedPlan.scope.allowedActions.map((action, index) => (0, import_jsx_runtime6.jsx)("li", { children: action }, index)) }), (0, import_jsx_runtime6.jsx)("h4", { children: t("goals.excludedTargets") }), (0, import_jsx_runtime6.jsx)("ul", { children: displayedPlan.scope.excludedTargets.length === 0 ? (0, import_jsx_runtime6.jsx)("li", { children: t("memory.none") }) : displayedPlan.scope.excludedTargets.map((target, index) => (0, import_jsx_runtime6.jsx)("li", { children: target }, index)) }), (0, import_jsx_runtime6.jsx)("h4", { children: t("goals.constraints") }), (0, import_jsx_runtime6.jsx)("ul", { children: displayedPlan.scope.constraints.length === 0 ? (0, import_jsx_runtime6.jsx)("li", { children: t("memory.none") }) : displayedPlan.scope.constraints.map((constraint, index) => (0, import_jsx_runtime6.jsx)("li", { children: constraint }, index)) }), displayedPlan.scope.execution !== void 0 && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("h4", { children: t("goals.executionScope") }), (0, import_jsx_runtime6.jsx)("pre", { children: JSON.stringify(displayedPlan.scope.execution, null, 2) })] })] })] }), roles2 !== void 0 && tab === "memory" && (0, import_jsx_runtime6.jsxs)("section", { className: TeamAction_default.memory, children: [(0, import_jsx_runtime6.jsx)("h3", { children: t("memory.title") }), (0, import_jsx_runtime6.jsx)("p", { className: TeamAction_default.sectionHint, children: t("memory.hint") }), team?.brief === void 0 ? (0, import_jsx_runtime6.jsx)("p", { children: t("memory.empty") }) : (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(team.brief.goalRevision === void 0 || team.brief.goalRevision !== (team.goal?.revision ?? 0) || team.goal?.status === "revoked") && (0, import_jsx_runtime6.jsx)("p", { role: "status", children: t("memory.historical") }), (0, import_jsx_runtime6.jsxs)("article", { children: [(0, import_jsx_runtime6.jsx)("h4", { children: t("memory.objective") }), (0, import_jsx_runtime6.jsx)("p", { children: team.brief.objective })] }), (0, import_jsx_runtime6.jsxs)("article", { children: [(0, import_jsx_runtime6.jsx)("h4", { children: t("memory.authorization") }), (0, import_jsx_runtime6.jsx)("p", { children: team.brief.authorization || t("memory.none") })] }), (0, import_jsx_runtime6.jsxs)("article", { children: [(0, import_jsx_runtime6.jsx)("h4", { children: t("memory.decisions") }), (0, import_jsx_runtime6.jsx)("p", { children: team.brief.decisions || t("memory.none") })] })] })] }), tab === "overview" && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [error !== null && (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.error, role: "alert", children: [(0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.StateDot, { state: "error" }), error] }), team === void 0 && (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.notice, role: "status", children: [(0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.StateDot, { state: opening || listing || recovery.state === "loading" ? "ongoing" : "warning" }), t(opening || listing || recovery.state === "loading" ? "loading" : "unavailable"), !opening && !listing && recovery.state !== "loading" && (0, import_jsx_runtime6.jsx)("button", { type: "button", className: TeamAction_default.secondaryButton, onClick: recovery.retry, children: t("recovery.retry") })] }), team !== void 0 && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [team.failure !== void 0 && (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.error, role: "alert", children: [(0, import_jsx_runtime6.jsx)(import_dsh_client_ui_primitives.StateDot, { state: "error" }), t("failure", { message: team.failure })] }), roles2 !== void 0 && (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.metrics, children: [(0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("strong", { children: team.members.length }), (0, import_jsx_runtime6.jsx)("span", { children: t("roster") })] }), (0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("strong", { children: team.tasks.length }), (0, import_jsx_runtime6.jsx)("span", { children: t("work.openTasks") })] }), (0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("strong", { children: team.completedTaskCount ?? team.tasks.filter((task) => task.status === "completed").length }), (0, import_jsx_runtime6.jsx)("span", { children: t("workspace.completed") })] })] }), (0, import_jsx_runtime6.jsxs)("div", { className: roles2 !== void 0 ? TeamAction_default.overviewColumns : void 0, children: [(0, import_jsx_runtime6.jsxs)("section", { children: [(0, import_jsx_runtime6.jsxs)("h3", { children: [t("roster"), team.members.length > 1 && (0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.count, children: team.members.length })] }), (0, import_jsx_runtime6.jsx)("div", { className: TeamAction_default.roster, children: teamHierarchy(team.members).map(({ member, depth }) => (0, import_jsx_runtime6.jsx)(TeamMemberRow, { member, memberCount: team.members.length, depth, ...member.parentId === void 0 ? {} : { parentName: team.members.find((parent) => parent.id === member.parentId)?.name ?? t("memory.none") }, sessionId, useSessions, useSessionStatus, openTeammate, onSelect: (id) => {
    setSelectedMemberId(id);
    setSelectedTaskId(null);
  }, onError: setError, t }, member.id)) })] }), (0, import_jsx_runtime6.jsx)("section", { children: team.tasks.length === 0 ? (0, import_jsx_runtime6.jsxs)("p", { className: TeamAction_default.emptyNotice, children: [t("view.noActiveTasks"), " \xB7 ", t("view.completedHint", { count: team.completedTaskCount ?? 0 })] }) : (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsxs)("h3", { children: [t("tasks"), (0, import_jsx_runtime6.jsx)("span", { className: TeamAction_default.count, children: team.tasks.length })] }), (0, import_jsx_runtime6.jsx)("div", { className: roles2 !== void 0 ? TeamAction_default.groupGrid : TeamAction_default.tasks, children: taskGroups.filter((group) => group.tasks.length > 0 || roles2 !== void 0 && group.members.length > 1).map((group) => (0, import_jsx_runtime6.jsxs)("section", { className: TeamAction_default.taskGroup, children: [roles2 !== void 0 && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.groupHeading, children: [(0, import_jsx_runtime6.jsx)("h4", { children: group.leader?.expert?.name ?? group.leader?.name ?? t(group.id === "lead" ? "workspace.leadGroup" : "workspace.unassignedGroup") }), (0, import_jsx_runtime6.jsx)("span", { children: t("workspace.groupProgress", {
    completed: group.tasks.filter((task) => task.status === "completed").length,
    total: group.tasks.length
  }) })] }), group.members.length > 0 && (0, import_jsx_runtime6.jsxs)("div", { className: TeamAction_default.groupPeople, children: [group.members.filter((member) => member.role !== "lead").slice(0, 5).map((member) => (0, import_jsx_runtime6.jsx)("button", { type: "button", className: TeamAction_default.groupPerson, onClick: () => {
    setSelectedMemberId(member.id);
    setSelectedTaskId(null);
  }, children: member.expert?.name ?? member.name }, member.id)), group.members.filter((member) => member.role !== "lead").length > 5 && (0, import_jsx_runtime6.jsxs)("span", { className: TeamAction_default.groupMore, children: ["+", group.members.filter((member) => member.role !== "lead").length - 5] })] })] }), group.tasks.length === 0 ? (0, import_jsx_runtime6.jsx)("p", { className: TeamAction_default.groupEmpty, children: t("view.noTask") }) : group.tasks.map((task) => (0, import_jsx_runtime6.jsx)(TaskCard, { task, ownerRunning: taskActivities.get(task.id), currentGoalRevision: team.goal?.revision, duplicate: duplicateSubjects.has(task.id), onSelect: setSelectedTaskId, t }, task.id))] }, group.id)) })] }) }), roles2 !== void 0 && (0, import_jsx_runtime6.jsxs)("aside", { className: TeamAction_default.inspector, "aria-label": t("workspace.details"), children: [(0, import_jsx_runtime6.jsx)("h3", { children: t("workspace.details") }), selectedTask !== void 0 ? (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("strong", { children: selectedTask.subject }), (0, import_jsx_runtime6.jsx)("p", { children: selectedTask.description }), (0, import_jsx_runtime6.jsxs)("dl", { children: [(0, import_jsx_runtime6.jsx)("dt", { children: t("owner") }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedTask.ownerName ?? t("unowned") }), selectedTask.reviewerName !== void 0 && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("dt", { children: t("view.reviewer") }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedTask.reviewerName })] }), selectedTask.autoAssign !== void 0 && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("dt", { children: t("view.autoAssign") }), (0, import_jsx_runtime6.jsx)("dd", { children: t(selectedTask.autoAssign ? "view.enabled" : "view.disabled") })] }), selectedTask.requiredSkill !== void 0 && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("dt", { children: t("view.requiredSkill") }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedTask.requiredSkill })] }), (0, import_jsx_runtime6.jsx)("dt", { children: t("view.status") }), (0, import_jsx_runtime6.jsx)("dd", { children: t(taskWorkStateKey(selectedTask, taskActivities.get(selectedTask.id), team.goal?.revision) ?? statusKey(selectedTask.status)) }), (0, import_jsx_runtime6.jsx)("dt", { children: t("work.criteria") }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedTask.work?.plan.acceptanceCriteria.join("\n") ?? t("memory.none") })] }), (0, import_jsx_runtime6.jsx)(TaskWorkDetails, { task: selectedTask, t }), (0, import_jsx_runtime6.jsx)(AdviserFindings, { task: selectedTask, findings: team.adviserDecisions, t })] }) : selectedMember !== void 0 ? (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("strong", { children: selectedMember.name }), (0, import_jsx_runtime6.jsx)("p", { children: selectedMember.description ?? t("workspace.noDescription") }), (0, import_jsx_runtime6.jsxs)("dl", { children: [(0, import_jsx_runtime6.jsx)("dt", { children: t("parent") }), (0, import_jsx_runtime6.jsx)("dd", { children: team.members.find((member) => member.id === selectedMember.parentId)?.name ?? t("memory.none") }), (0, import_jsx_runtime6.jsx)("dt", { children: t("model") }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedModel?.model ?? t("view.sessionModel") }), (0, import_jsx_runtime6.jsx)("dt", { children: t("reasoningEffort") }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedModel?.reasoningEffort ?? t("roles.defaultEffort") }), (0, import_jsx_runtime6.jsx)("dt", { children: t("workspace.modelSource") }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedModel === void 0 ? t("memory.none") : t(`view.modelSource.${selectedModel.source}`) }), selectedModel?.next !== void 0 && (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("dt", { children: t("view.nextModel", { model: selectedModel.next.model }) }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedModel.next.reasoningEffort ?? t("roles.defaultEffort") })] }), (0, import_jsx_runtime6.jsx)("dt", { children: t("workspace.groupMembers") }), (0, import_jsx_runtime6.jsx)("dd", { children: team.members.filter((member) => member.parentId === selectedMember.id).length }), (0, import_jsx_runtime6.jsx)("dt", { children: t("view.persona") }), (0, import_jsx_runtime6.jsx)("dd", { children: selectedMember.persona ?? t("memory.none") })] }), selectedMember.error !== void 0 && (0, import_jsx_runtime6.jsx)("p", { role: "status", className: TeamAction_default.diagnostic, children: selectedMember.error }), selectedMember.phase === "provisioning" && (0, import_jsx_runtime6.jsx)("p", { role: "status", children: t("memberStatus.provisioning") })] }) : (0, import_jsx_runtime6.jsx)("p", { children: t("workspace.noSelection") })] })] })] })] })] })] }), document.body)] });
}

// packages/team/modules/ui/lib/types/client/locales.js
var NS = "agent-team";
var zh = {
  "view.diagnostics": "\u8BCA\u65AD\u4E0E\u8D44\u6E90",
  "diagnostics.title": "\u8C03\u5EA6\u8BCA\u65AD",
  "diagnostics.hint": "\u53EA\u5C55\u793A\u672C\u6B21\u4F1A\u8BDD\u53EF\u89C2\u5BDF\u5230\u7684\u72B6\u6001\uFF1B\u5BFC\u51FA\u4EC5\u5305\u542B\u7F16\u53F7\u3001\u7248\u672C\u4E0E\u8BA1\u6570\uFF0C\u4E0D\u542B\u76EE\u6807\u3001\u4EBA\u8BBE\u3001\u6280\u80FD\u6B63\u6587\u6216\u8FDE\u63A5\u914D\u7F6E\u3002",
  "diagnostics.goal": "\u76EE\u6807\u7248\u672C",
  "diagnostics.provision": "\u65B9\u6848\u6D3E\u5DE5",
  "diagnostics.review": "\u5F85\u590D\u6838\u6210\u679C",
  "diagnostics.failed": "\u521B\u5EFA\u5931\u8D25\u6210\u5458",
  "diagnostics.unknown": "\u672A\u89C2\u6D4B",
  "diagnostics.health": "\u5DE5\u5177\u51C6\u5165\u4E0E\u8054\u7F51\u72B6\u6001\uFF1A\u5728\u6210\u5458\u4E2D\u4F7F\u7528 team_help tools / network \u68C0\u67E5\u3002\u6CE8\u518C\u6210\u529F\u540E\u8FD8\u9700\u4E00\u6B21\u65E0\u5BB3\u7684\u771F\u5B9E\u8C03\u7528\u3002",
  "diagnostics.cost": "\u4F9B\u5E94\u5546\u5B9E\u9645\u8BA1\u8D39\u672A\u63A5\u5165\u6B64\u89C6\u56FE\uFF1B\u4E0D\u4F1A\u6309\u8BF7\u6C42\u6570\u63A8\u7B97\u8D39\u7528\u3002\u5E76\u53D1\u4E0A\u9650\u4E5F\u4E0D\u4EE3\u8868\u8D26\u6237\u5B9E\u9645\u53EF\u7528\u989D\u5EA6\u3002",
  "diagnostics.export": "\u5BFC\u51FA\u8BCA\u65AD\uFF08\u4E0D\u542B\u6B63\u6587\uFF09",
  "work.resourceBusy": "\u7B49\u5F85\u72EC\u5360\u6D4F\u89C8\u5668\u3001\u8BBE\u5907\u6216\u8D26\u53F7\u8D44\u6E90",
  "plan.resources": "\u72EC\u5360\u8D44\u6E90",
  "memberStatus.unknown": "\u72B6\u6001\u540C\u6B65\u4E2D",
  "view.group.coordination": "\u6C9F\u901A\u4E0E\u51B3\u7B56",
  "view.group.experts": "\u957F\u671F\u4E13\u5BB6",
  "view.group.execution": "\u6267\u884C\u4E0E\u9A8C\u8BC1",
  "view.group.legacy": "\u539F\u6A21\u5F0F\u6210\u5458",
  "view.taskSearch": "\u641C\u7D22\u4EFB\u52A1\u3001\u8D1F\u8D23\u4EBA\u6216\u4EA4\u4ED8\u7269",
  "view.taskFilter": "\u4EFB\u52A1\u72B6\u6001",
  "view.filter.all": "\u5168\u90E8",
  "view.filter.pending": "\u5F85\u6267\u884C",
  "view.filter.in_progress": "\u8FDB\u884C\u4E2D",
  "view.filter.completed": "\u5DF2\u9A8C\u6536",
  "view.showMore": "\u663E\u793A\u66F4\u591A",
  "view.fullPlan": "\u5B8C\u6574\u65B9\u6848",
  "view.filteredTasks": "\u663E\u793A {visible} / {total} \u9879",
  "view.compact": "\u7D27\u51D1\u6392\u5217",
  "view.comfortable": "\u5BBD\u677E\u6392\u5217",
  "view.isolationHint": "\u6210\u5458\u4F7F\u7528\u79C1\u6709\u5DE5\u4F5C\u533A\uFF1B\u53D1\u5E03\u4F1A\u6838\u5BF9\u51B2\u7A81\u3002\u5916\u90E8\u5B8C\u6574\u6743\u9650\u5DE5\u5177\u4ECD\u9700\u72EC\u7ACB\u7EA6\u675F\u3002",
  "plan.automation": "\u81EA\u52A8\u6D3E\u5DE5",
  "plan.onDemand": "\u6309\u5DF2\u786E\u8BA4\u65B9\u6848\u6309\u9700\u521B\u5EFA",
  "plan.manual": "\u624B\u52A8\u521B\u5EFA",
  "view.communicator": "\u4E3B\u6C9F\u901A",
  "view.retained": "\u957F\u671F\u6210\u5458",
  "view.expert": "\u957F\u671F\u4E13\u5BB6",
  "view.summary": "\u56E2\u961F\u8FD0\u884C\u6982\u89C8",
  "view.teamCount": "\u56E2\u961F\u6210\u5458",
  "view.legacyCount": "\u539F\u6A21\u5F0F\u5B50\u4EE3\u7406",
  "view.noActiveTasks": "\u5F53\u524D\u6CA1\u6709\u8FDB\u884C\u4E2D\u7684\u4EFB\u52A1",
  "view.openArchive": "\u67E5\u770B\u5F52\u6863\u4EFB\u52A1",
  "view.completedHint": "\u5DF2\u5B8C\u6210 {count} \u9879\u4EFB\u52A1\uFF0C\u6210\u679C\u4E0E\u9A8C\u6536\u8BB0\u5F55\u4FDD\u5B58\u5728\u5F52\u6863\u4E2D",
  "plan.roster": "\u65B9\u6848\u6210\u5458 \xB7 \u786E\u8BA4\u65F6\u914D\u7F6E",
  "plan.rosterHint": "\u8FD9\u91CC\u4FDD\u7559\u65B9\u6848\u7248\u672C\uFF1B\u5B9E\u9645\u8BF7\u6C42\u914D\u7F6E\u8BF7\u67E5\u770B\u6210\u5458\u8BE6\u60C5",
  "plan.retain": "\u4FDD\u7559\u5386\u53F2",
  "plan.replan": "\u57FA\u4E8E\u65B0\u76EE\u6807\u91CD\u8BA2\u8BA1\u5212",
  "plan.skills": "\u5DF2\u9009\u6280\u80FD",
  "plan.owner": "\u6267\u884C\u8005",
  "plan.reviewer": "\u72EC\u7ACB\u590D\u6838\u8005",
  "plan.dependencies": "\u524D\u7F6E\u4EFB\u52A1",
  "plan.inputs": "\u8F93\u5165\u6587\u4EF6",
  "plan.outputs": "\u4EA4\u4ED8\u8303\u56F4",
  "plan.dual": "\u72EC\u7ACB\u590D\u6838\uFF0C\u5E76\u7ECF\u89C4\u5212\u4E0E\u8D28\u91CF\u519B\u5E08\u5BA1\u6838",
  "plan.independent": "\u72EC\u7ACB\u590D\u6838",
  "plan.budget": "\u8D44\u6E90\u9884\u7B97",
  "plan.members": "\u4E0B\u7EA7\u6210\u5458\u4E0A\u9650",
  "plan.requests": "\u6A21\u578B\u8BF7\u6C42\u5E76\u53D1\u4E0A\u9650",
  "plan.recovery": "\u5931\u8D25\u4E0E\u6062\u590D\u65B9\u6CD5",
  "plan.previous": "\u65E7\u4EFB\u52A1\u5904\u7406",
  "work.blocker.goal": "\u76EE\u6807\u5DF2\u66F4\u65B0 \xB7 \u5148\u6838\u5BF9\u539F\u8BA1\u5212\u548C\u6210\u679C",
  "work.blocker.dependencies": "\u7B49\u5F85\u524D\u7F6E\u4EFB\u52A1\u9A8C\u6536",
  "work.blocker.reviewer_missing": "\u5F85\u6307\u5B9A\u72EC\u7ACB\u590D\u6838\u8005",
  "work.blocker.adviser_review": "\u7B49\u5F85\u53CC\u519B\u5E08\u5BA1\u6838",
  "work.blocker.skills": "\u7F3A\u5C11\u9002\u7528\u4E8E\u5F53\u524D\u76EE\u6807\u7684\u6280\u80FD",
  "work.blocker.manual": "\u5F85\u961F\u957F\u5206\u914D\u6216\u542F\u7528\u81EA\u52A8\u6D3E\u5DE5",
  "member.roleTitle": "\u56E2\u961F\u804C\u8D23",
  "member.roleHint": "\u5F85\u547D\u65F6\u53EF\u8C03\u6574\u804C\u8D23\uFF0C\u4FDD\u7559\u4F1A\u8BDD\u3001\u4EBA\u8BBE\u3001\u6280\u80FD\u548C\u5DF2\u6709\u6210\u679C\u3002\u804C\u8D23\u53D8\u5316\u540E\uFF0C\u519B\u5E08\u7684\u65E7\u5BA1\u6838\u610F\u89C1\u9700\u91CD\u65B0\u786E\u8BA4",
  "member.roleUnset": "\u5C1A\u672A\u6307\u5B9A\u804C\u8D23",
  "member.roleReason": "\u8C03\u6574\u539F\u56E0",
  "member.saveRole": "\u4FDD\u5B58\u804C\u8D23",
  "member.roleSaved": "\u804C\u8D23\u5DF2\u4FDD\u5B58",
  "view.legacy.one-shot": "\u539F\u6A21\u5F0F \xB7 \u5355\u6B21\u5DE5\u4F5C\u6D41\uFF08\u7ED3\u679C\u7531\u539F\u6D41\u7A0B\u6536\u96C6\uFF09",
  "view.legacy.continuable": "\u539F\u6A21\u5F0F \xB7 \u53EF\u7EE7\u7EED\u5BF9\u8BDD",
  "view.legacy.unknown": "\u539F\u6A21\u5F0F \xB7 \u6253\u5F00\u4F1A\u8BDD\u67E5\u770B\u72B6\u6001",
  trigger: "\u667A\u80FD\u4F53\u56E2\u961F",
  "goals.executionScope": "\u5DE5\u5177\u53EF\u8BBF\u95EE\u7684\u8D44\u6E90",
  "goals.readPaths": "\u53EF\u8BFB\u53D6\u7684\u6587\u4EF6\u6216\u76EE\u5F55",
  "goals.writePaths": "\u53EF\u5199\u5165\u7684\u6587\u4EF6\u6216\u76EE\u5F55",
  "goals.webOrigins": "\u53EF\u8BBF\u95EE\u7684\u7F51\u7AD9\u6765\u6E90",
  "goals.allowSearch": "\u5141\u8BB8\u516C\u5F00\u8054\u7F51\u641C\u7D22",
  "goals.allowUnrestrictedExecution": "\u5141\u8BB8\u547D\u4EE4\u884C\u4E0E\u7A0B\u5E8F\u8BBF\u95EE\u4E0D\u9650\u8303\u56F4\u7684\u8D44\u6E90",
  "goals.executionHint": "\u6BCF\u884C\u4E00\u9879\uFF1B\u8DEF\u5F84\u76F8\u5BF9\u4E8E\u6210\u5458\u5DE5\u4F5C\u533A\u3002\u201C.\u201D\u8868\u793A\u5DE5\u4F5C\u533A\uFF0C\u201C*\u201D\u8868\u793A\u4E0D\u9650\u8303\u56F4\u3002\u7F51\u5740\u586B\u5199\u5B8C\u6574\u6765\u6E90\uFF0C\u4F8B\u5982 https://example.com\u3002\u547D\u4EE4\u884C\u548C PTC \u65E0\u6CD5\u6309\u7F51\u5740\u9650\u5236\u7F51\u7EDC\uFF0C\u542F\u7528\u5B83\u4EEC\u5FC5\u987B\u5728\u4E09\u4E2A\u8D44\u6E90\u5217\u8868\u4E2D\u660E\u786E\u586B\u5199\u201C*\u201D\uFF1B\u6587\u4EF6\u6C99\u7BB1\u4ECD\u7136\u751F\u6548\u3002\u90E8\u5206\u8303\u56F4\u8BF7\u4F7F\u7528\u53EF\u9010\u9879\u6838\u5BF9\u8D44\u6E90\u7684\u666E\u901A\u5DE5\u5177\u3002",
  "goals.enabled": "\u5141\u8BB8",
  "goals.disabled": "\u4E0D\u5141\u8BB8",
  "work.details": "\u6267\u884C\u7248\u672C\u4E0E\u9A8C\u6536\u8BB0\u5F55",
  "work.input": "\u8F93\u5165\u7248\u672C",
  "work.environment": "\u73AF\u5883\u7248\u672C",
  "work.goal": "\u76EE\u6807\u7248\u672C",
  "work.plan": "\u8BA1\u5212\u7248\u672C",
  "work.attempt": "\u6267\u884C\u6B21\u6570",
  "work.criteria": "\u9A8C\u6536\u8981\u6C42",
  "work.submission": "\u63D0\u4EA4\u7684\u6210\u679C",
  "work.review": "\u72EC\u7ACB\u590D\u6838\u8BB0\u5F55",
  "work.adviserGate": "\u53CC\u519B\u5E08\u5173\u952E\u5BA1\u6838",
  "work.adviserPending": "\u5F85\u5BA1\u6838",
  "work.adviserApproved": "\u8BA4\u53EF",
  "work.adviserRevise": "\u8981\u6C42\u4FEE\u8BA2",
  "work.legacy": "\u5386\u53F2\u5B8C\u6210\u8BB0\u5F55\uFF0C\u5C1A\u672A\u6838\u5BF9\u8F93\u5165\u7248\u672C\u548C\u9A8C\u6536\u4F9D\u636E\u3002",
  "work.declaredVersions": "\u8FD9\u91CC\u4FDD\u7559\u58F0\u660E\u7684\u7248\u672C\u548C\u590D\u6838\u8BB0\u5F55\uFF1B\u590D\u7528\u524D\u4ECD\u987B\u6838\u5BF9\u5B9E\u9645\u6587\u4EF6\u4E0E\u73AF\u5883\u3002",
  "work.stale": "\u9700\u8981\u91CD\u65B0\u6838\u5BF9",
  "work.goalChanged": "\u65E7\u76EE\u6807\u7248\u672C\uFF0C\u9700\u91CD\u65B0\u89C4\u5212",
  "work.phase.pending": "\u5F85\u6267\u884C",
  "work.phase.running": "\u6267\u884C\u4E2D",
  "work.phase.submitted": "\u5F85\u72EC\u7ACB\u590D\u6838",
  "work.phase.accepted": "\u590D\u6838\u901A\u8FC7",
  "work.phase.rejected": "\u9700\u8981\u4FEE\u8BA2",
  "work.phase.cancelled": "\u672C\u6B21\u6267\u884C\u5DF2\u7ED3\u675F",
  "work.ownerInactive": "\u6210\u5458\u4F1A\u8BDD\u5F53\u524D\u672A\u8FD0\u884C\uFF0C\u5F85\u63A5\u7EED",
  "work.ownerUnknown": "\u4F1A\u8BDD\u72B6\u6001\u672A\u77E5\uFF0C\u5F85\u6838\u5BF9",
  "work.recovery.resume": "\u6210\u5458\u4F1A\u8BDD\u5DF2\u7ED3\u675F\uFF0C\u5F85\u6062\u590D\u6267\u884C",
  "work.recovery.reconcile": "\u6210\u5458\u4F1A\u8BDD\u5DF2\u7ED3\u675F\uFF0C\u5F85\u6838\u5BF9\u5DF2\u6709\u53D8\u66F4",
  "work.recovery.review": "\u5F85\u72EC\u7ACB\u590D\u6838",
  "work.recovery.inspect": "\u6210\u5458\u4F1A\u8BDD\u5DF2\u7ED3\u675F\uFF0C\u5F85\u68C0\u67E5\u6267\u884C\u7ED3\u679C",
  "work.duplicateSubject": "\u540C\u6807\u9898\u4EFB\u52A1\uFF0C\u6309\u4EFB\u52A1\u7F16\u53F7\u5206\u522B\u6838\u5BF9",
  "work.openTasks": "\u672A\u5B8C\u6210\u4EFB\u52A1",
  "view.title": "\u56E2\u961F",
  "view.subtitle": "\u76EE\u6807\u4E00\u81F4\uFF0C\u8FDB\u5EA6\u6301\u7EED\u4FDD\u5B58\u3002",
  "view.settings": "\u56E2\u961F\u8BBE\u7F6E",
  "view.backToMembers": "\u8FD4\u56DE\u6210\u5458",
  "view.goal": "\u76EE\u6807",
  "view.scope": "\u67E5\u770B\u76EE\u6807\u4E0E\u8303\u56F4",
  "view.members": "\u6210\u5458",
  "view.memberTree": "\u56E2\u961F\u6210\u5458\u6811",
  "view.groupTasks": "\u5206\u7EC4\u4EFB\u52A1",
  "view.inspectGroupMember": "\u67E5\u770B\u5C0F\u7EC4\u6210\u5458 {name}",
  "view.taskDetail": "\u4EFB\u52A1\u8BE6\u60C5",
  "view.tasks": "\u4EFB\u52A1",
  "view.memory": "\u8BB0\u5FC6",
  "view.experts": "\u957F\u671F\u4E13\u5BB6",
  "view.goals": "\u76EE\u6807\u4E0E\u8303\u56F4",
  "view.mailbox": "\u6D88\u606F",
  "mailbox.hint": "\u67E5\u770B\u56E2\u961F\u6D88\u606F\u7684\u6295\u9012\u72B6\u6001\u3002\u5386\u53F2\u6D88\u606F\u4E0D\u4F1A\u81EA\u52A8\u8FDB\u5165\u65B0\u76EE\u6807\uFF0C\u53EA\u6709\u961F\u957F\u53EF\u4EE5\u663E\u5F0F\u91C7\u7EB3\u3002",
  "mailbox.refresh": "\u5237\u65B0",
  "mailbox.loading": "\u6B63\u5728\u8BFB\u53D6\u6D88\u606F\u2026",
  "mailbox.empty": "\u6682\u65E0\u56E2\u961F\u6D88\u606F",
  "mailbox.loadFailed": "\u6D88\u606F\u5217\u8868\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5\u3002",
  "mailbox.detailFailed": "\u6D88\u606F\u8BE6\u60C5\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u3002",
  "mailbox.actionFailed": "\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u6D88\u606F\u4ECD\u4FDD\u7559\u3002\u8BF7\u6838\u5BF9\u72B6\u6001\u540E\u91CD\u8BD5\u3002",
  "mailbox.accepted": "\u6D88\u606F\u5DF2\u9001\u8FBE\u3002",
  "mailbox.queued": "\u6D88\u606F\u5DF2\u4FDD\u7559\uFF0C\u7B49\u5F85\u6295\u9012\u3002",
  "mailbox.status.pending": "\u7B49\u5F85\u6295\u9012",
  "mailbox.status.quarantined": "\u5386\u53F2\u9694\u79BB",
  "mailbox.status.delivered": "\u5DF2\u9001\u8FBE",
  "mailbox.status.retry-exhausted": "\u81EA\u52A8\u91CD\u8BD5\u5DF2\u7528\u5C3D",
  "mailbox.unversioned": "\u65E0\u76EE\u6807\u7248\u672C",
  "mailbox.goalRevision": "\u76EE\u6807\u7248\u672C {revision}",
  "mailbox.retry": "\u91CD\u8BD5\u6295\u9012",
  "mailbox.adopt": "\u91C7\u7EB3\u5230\u5F53\u524D\u76EE\u6807",
  "mailbox.exhausted": "\u5DF2\u5C1D\u8BD5 {attempts} \u6B21\uFF0C\u53EF\u624B\u52A8\u91CD\u8BD5\u3002",
  "mailbox.loadingDetail": "\u6B63\u5728\u8BFB\u53D6\u8BE6\u60C5\u2026",
  "mailbox.id": "\u6D88\u606F\u7F16\u53F7",
  "mailbox.adoptedFrom": "\u91C7\u7EB3\u81EA",
  "mailbox.nonText": "\u975E\u6587\u5B57\u5185\u5BB9\uFF0C\u8BF7\u5728\u6210\u5458\u4F1A\u8BDD\u4E2D\u67E5\u770B\u3002",
  "mailbox.pagination": "\u6D88\u606F\u5206\u9875",
  "mailbox.previous": "\u4E0A\u4E00\u9875",
  "mailbox.next": "\u4E0B\u4E00\u9875",
  "mailbox.range": "\u663E\u793A {start}\u2013{end} / {total} \u6761",
  "goals.hint": "\u76EE\u6807\u548C\u8303\u56F4\u5728\u4F60\u786E\u8BA4\u540E\u751F\u6548\uFF0C\u53D8\u66F4\u8BB0\u5F55\u968F\u4F1A\u8BDD\u4FDD\u7559\u3002",
  "goals.unconfirmed": "\u5F85\u786E\u8BA4",
  "goals.active": "\u5DF2\u786E\u8BA4 \xB7 \u7248\u672C {revision}",
  "goals.revoked": "\u5DF2\u64A4\u9500 \xB7 \u7248\u672C {revision}",
  "goals.revokedShort": "\u76EE\u6807\u5DF2\u64A4\u9500",
  "goals.revokedHint": "\u76EE\u6807\u5DF2\u64A4\u9500\uFF0C\u56E2\u961F\u4E0D\u518D\u63A5\u53D7\u65B0\u64CD\u4F5C\u3002\u91CD\u65B0\u786E\u8BA4\u76EE\u6807\u540E\u53EF\u4EE5\u7EE7\u7EED\u3002",
  "goals.empty": "\u5148\u660E\u786E\u76EE\u6807\u3001\u8303\u56F4\u548C\u9A8C\u6536\u8981\u6C42\uFF0C\u518D\u786E\u8BA4\u56E2\u961F\u5DE5\u4F5C\u3002",
  "goals.objective": "\u4EFB\u52A1\u76EE\u6807",
  "goals.plan": "\u5B8C\u6574\u56E2\u961F\u65B9\u6848",
  "goals.planHint": "\u65B0\u65B9\u6848\u4F7F\u7528 project_plan \u7ED3\u6784\uFF1A\u6210\u5458\u3001\u5B9E\u9645\u6A21\u578B\u3001\u601D\u8003\u6863\u3001\u804C\u8D23\u3001\u6280\u80FD\u3001\u4EFB\u52A1\u3001\u4F9D\u8D56\u3001\u4EA4\u4ED8\u7269\u4E0E\u8D44\u6E90\u9884\u7B97\u3002\u5B8C\u6574\u65B9\u6848\u533A\u4EE5\u4E2D\u6587\u5206\u7EC4\u5C55\u793A\uFF1B\u9AD8\u7EA7\u7F16\u8F91\u4FDD\u7559 JSON\u3002",
  "goals.acceptanceCriteria": "\u9A8C\u6536\u8981\u6C42",
  "goals.coverage": "\u6388\u6743\u8303\u56F4",
  "goals.coverage.task": "\u4EC5\u672C\u6B21\u4EFB\u52A1",
  "goals.coverage.partial": "\u90E8\u5206\u6388\u6743",
  "goals.coverage.full": "\u5217\u660E\u8303\u56F4\u5185\u5168\u91CF\u6388\u6743",
  "goals.coverageHint": "\u5168\u91CF\u6388\u6743\u4ECD\u4EE5\u8FD9\u91CC\u5217\u660E\u7684\u5BF9\u8C61\u3001\u64CD\u4F5C\u548C\u9650\u5236\u4E3A\u51C6\u3002",
  "goals.targets": "\u5DE5\u4F5C\u5BF9\u8C61",
  "goals.allowedActions": "\u5141\u8BB8\u7684\u64CD\u4F5C",
  "goals.excludedTargets": "\u6392\u9664\u7684\u5BF9\u8C61",
  "goals.constraints": "\u5176\u4ED6\u9650\u5236",
  "goals.linesHint": "\u4EE5\u4E0B\u6BCF\u884C\u586B\u5199\u4E00\u9879\uFF1B\u9A8C\u6536\u8981\u6C42\u3001\u5DE5\u4F5C\u5BF9\u8C61\u548C\u5141\u8BB8\u7684\u64CD\u4F5C\u5FC5\u586B\u3002",
  "goals.pending": "\u5F85\u5BA1\u9605\u63D0\u6848 \xB7 \u7248\u672C {revision}",
  "goals.proposalDetails": "\u67E5\u770B\u5B8C\u6574\u63D0\u6848",
  "goals.review": "\u5BA1\u9605\u5E76\u786E\u8BA4",
  "goals.rejected": "\u63D0\u6848\u672A\u901A\u8FC7\uFF0C\u5F53\u524D\u76EE\u6807\u4FDD\u6301\u539F\u503C\u3002",
  "goals.reviewing": "\u8BF7\u5728\u5BF9\u8BDD\u8F93\u5165\u533A\u7684\u786E\u8BA4\u5361\u5BA1\u9605\u8303\u56F4\uFF1B\u53EF\u4EE5\u5207\u56DE\u5BF9\u8BDD\u7EE7\u7EED\u786E\u8BA4\u3002",
  "goals.create": "\u8BBE\u5B9A\u76EE\u6807",
  "goals.edit": "\u4FEE\u6539\u76EE\u6807",
  "goals.restore": "\u91CD\u65B0\u786E\u8BA4\u76EE\u6807",
  "goals.revoke": "\u64A4\u9500\u76EE\u6807\u2026",
  "goals.revocation": "\u64A4\u9500\u63D0\u6848",
  "goals.reason": "\u64A4\u9500\u539F\u56E0",
  "goals.editing": "\u7F16\u8F91\u63D0\u6848",
  "goals.saving": "\u6B63\u5728\u4FDD\u5B58\u2026",
  "goals.saveAndReview": "\u4FDD\u5B58\u63D0\u6848\u5E76\u5BA1\u9605",
  "goals.cancelEdit": "\u653E\u5F03\u672C\u6B21\u7F16\u8F91",
  "goals.keepDraft": "\u5DF2\u6838\u5BF9\u6700\u65B0\u8303\u56F4\uFF0C\u4FDD\u7559\u7F16\u8F91\u7EE7\u7EED",
  "goals.conflict": "\u76EE\u6807\u6216\u63D0\u6848\u5DF2\u66F4\u65B0\u3002\u4F60\u7684\u7F16\u8F91\u4ECD\u7136\u4FDD\u7559\uFF0C\u8BF7\u6838\u5BF9\u4E0A\u65B9\u6700\u65B0\u8BB0\u5F55\u540E\u7EE7\u7EED\u3002",
  "goals.alreadyReviewing": "\u5DF2\u6709\u786E\u8BA4\u5361\u7B49\u5F85\u56DE\u7B54\uFF0C\u8BF7\u5230\u5BF9\u8BDD\u8F93\u5165\u533A\u7EE7\u7EED\u5BA1\u9605\u3002",
  "goals.noReviewer": "\u5F53\u524D\u8FDE\u63A5\u6CA1\u6709\u53EF\u7528\u7684\u786E\u8BA4\u754C\u9762\u3002\u63D0\u6848\u5DF2\u4FDD\u7559\uFF0C\u8BF7\u6062\u590D\u8FDE\u63A5\u540E\u91CD\u8BD5\u3002",
  "goals.invalid": "\u8BF7\u586B\u5199\u76EE\u6807\uFF0C\u5E76\u81F3\u5C11\u5217\u660E\u4E00\u9879\u9A8C\u6536\u8981\u6C42\u3001\u5DE5\u4F5C\u5BF9\u8C61\u548C\u5141\u8BB8\u7684\u64CD\u4F5C\u3002",
  "goals.tooLarge": "\u63D0\u6848\u5185\u5BB9\u8D85\u8FC7\u6B64\u63D2\u4EF6\u914D\u7F6E\u7684\u5927\u5C0F\u9650\u5236\uFF0C\u8BF7\u7CBE\u7B80\u540E\u91CD\u8BD5\u3002",
  "goals.reasonRequired": "\u8BF7\u586B\u5199\u64A4\u9500\u539F\u56E0\u3002",
  "goals.failed": "\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u5DF2\u4FDD\u5B58\u7684\u63D0\u6848\u548C\u5F53\u524D\u7F16\u8F91\u4ECD\u7136\u4FDD\u7559\u3002\u8BF7\u91CD\u8BD5\u3002",
  "experts.hint": "\u4FDD\u5B58\u4E13\u5BB6\u7684\u804C\u8D23\u3001\u4EBA\u8BBE\u548C\u6280\u80FD\uFF0C\u4F9B\u56E2\u961F\u91CD\u590D\u4F7F\u7528\u3002\u521B\u5EFA\u6863\u6848\u540E\uFF0C\u53EF\u5728\u5BF9\u8BDD\u4E2D\u5B89\u6392\u5DE5\u4F5C\u3002",
  "experts.search": "\u641C\u7D22\u4E13\u5BB6",
  "experts.showArchived": "\u663E\u793A\u5DF2\u5F52\u6863",
  "experts.untitled": "\u65B0\u4E13\u5BB6",
  "experts.archived": "\u5DF2\u5F52\u6863",
  "experts.unsaved": "\u5C1A\u672A\u4FDD\u5B58",
  "experts.saved": "\u5DF2\u4FDD\u5B58",
  "experts.empty": "\u6CA1\u6709\u5339\u914D\u7684\u4E13\u5BB6",
  "experts.add": "\u6DFB\u52A0\u4E13\u5BB6",
  "experts.refresh": "\u5237\u65B0\u76EE\u5F55",
  "experts.name": "\u4E13\u5BB6\u540D\u79F0",
  "experts.revision": "\u7248\u672C {revision}",
  "experts.newRevision": "\u76EE\u5F55\u5DF2\u6709\u7248\u672C {revision}\uFF0C\u4F60\u7684\u7F16\u8F91\u4ECD\u7136\u4FDD\u7559\u3002",
  "experts.reloadSelected": "\u653E\u5F03\u6B64\u5904\u7F16\u8F91\uFF0C\u8F7D\u5165\u6700\u65B0\u7248\u672C",
  "experts.modelHint": "\u4E0A\u4E0B\u6587\u548C\u8F93\u51FA\u957F\u5EA6\u6CBF\u7528 DSH \u4E2D\u8BE5\u6A21\u578B\u7684\u914D\u7F6E\u3002",
  "experts.skills": "\u6280\u80FD\u5F15\u7528 \xB7 \u6BCF\u884C\u4E00\u4E2A\u540D\u79F0",
  "experts.skillsHint": "\u586B\u5199\u5DF2\u5B89\u88C5\u7684\u6280\u80FD\u540D\u79F0\uFF1B\u8FD9\u91CC\u4FDD\u5B58\u5F15\u7528\uFF0C\u6280\u80FD\u5185\u5BB9\u7531 DSH \u52A0\u8F7D\u3002",
  "experts.archive": "\u5F52\u6863\u4E13\u5BB6\uFF08\u4FDD\u7559\u6863\u6848\u548C\u5DF2\u6709\u4F1A\u8BDD\uFF0C\u53EF\u6062\u590D\uFF09",
  "experts.save": "\u4FDD\u5B58\u4E13\u5BB6",
  "experts.bindings": "\u5F53\u524D\u56E2\u961F\u7684\u4F1A\u8BDD",
  "experts.bindingHint": "\u5DF2\u6709\u6210\u5458\u4FDD\u7559\u7ED1\u5B9A\u65F6\u7684\u6863\u6848\u7248\u672C\u548C\u5DE5\u4F5C\u8BB0\u5F55\u3002",
  "experts.unassigned": "\u5F53\u524D\u56E2\u961F\u5C1A\u672A\u5206\u914D\u6B64\u4E13\u5BB6\u3002",
  "experts.select": "\u9009\u62E9\u4E00\u4F4D\u4E13\u5BB6\uFF0C\u6216\u6DFB\u52A0\u65B0\u4E13\u5BB6\u3002",
  "experts.invalid": "\u8BF7\u586B\u5199\u4E13\u5BB6\u540D\u79F0\u3001\u804C\u8D23\uFF08\u6700\u591A 200 \u5B57\uFF09\u548C\u4EBA\u8BBE\uFF0C\u5E76\u68C0\u67E5\u6280\u80FD\u4E0E\u6A21\u578B\u9009\u9879\u3002",
  "experts.loadFailed": "\u4E13\u5BB6\u76EE\u5F55\u52A0\u8F7D\u5931\u8D25\uFF0C\u53EF\u4EE5\u5237\u65B0\u91CD\u8BD5\u3002",
  "experts.saveFailed": "\u4FDD\u5B58\u5931\u8D25\uFF0C\u7F16\u8F91\u5DF2\u4FDD\u7559\u3002\u8BF7\u91CD\u8BD5\u3002",
  "experts.conflict": "\u6863\u6848\u5DF2\u5728\u5176\u4ED6\u4F4D\u7F6E\u66F4\u65B0\u3002\u5F53\u524D\u7F16\u8F91\u5DF2\u4FDD\u7559\uFF0C\u8BF7\u5148\u6838\u5BF9\u6700\u65B0\u7248\u672C\u3002",
  "view.work": "\u5F53\u524D\u5DE5\u4F5C",
  "view.status": "\u72B6\u6001",
  "view.search": "\u641C\u7D22\u6210\u5458",
  "view.noMatches": "\u6CA1\u6709\u5339\u914D\u7684\u6210\u5458",
  "view.noTask": "\u6682\u65E0\u5206\u914D\u7684\u4EFB\u52A1",
  "view.sessionModel": "\u4F7F\u7528\u4F1A\u8BDD\u6A21\u578B",
  "view.descendant": "\u4E0B\u7EA7\u6210\u5458",
  "view.longTermMember": "\u957F\u671F\u6210\u5458",
  "view.boundExpert": "\u957F\u671F\u4E13\u5BB6 \xB7 \u5DF2\u7ED1\u5B9A\u6863\u6848",
  "view.function.planningAdviser": "\u89C4\u5212\u519B\u5E08",
  "view.function.qualityAdviser": "\u8D28\u91CF\u519B\u5E08",
  "view.function.domainAdviser": "\u9886\u57DF\u519B\u5E08",
  "view.function.groupLead": "\u5DE5\u4F5C\u7EC4\u957F",
  "view.function.executor": "\u6267\u884C\u6210\u5458",
  "view.function.verifier": "\u72EC\u7ACB\u9A8C\u8BC1",
  "view.memberCount": "\u663E\u793A {visible} / {total} \u4F4D\u6210\u5458",
  "view.memberHint": "\u70B9\u51FB\u6210\u5458\uFF0C\u67E5\u770B\u89D2\u8272\u3001\u8BB0\u5F55\u4E0E\u5386\u53F2\u4EFB\u52A1",
  "view.memberDetail": "\u6210\u5458\u8BE6\u60C5",
  "view.boundRevision": "\u7ED1\u5B9A\u7684\u4E13\u5BB6\u6863\u6848\u7248\u672C\uFF1A{revision}",
  "view.persona": "\u89D2\u8272\u4E0E\u5DE5\u4F5C\u6307\u4EE4",
  "view.memberTasks": "\u8D1F\u8D23\u7684\u4EFB\u52A1",
  "view.reviewer": "\u72EC\u7ACB\u590D\u6838\u4EBA",
  "view.autoAssign": "\u81EA\u52A8\u6D3E\u5DE5",
  "view.requiredSkill": "\u6240\u9700\u6280\u80FD",
  "view.enabled": "\u5DF2\u542F\u7528",
  "view.disabled": "\u672A\u542F\u7528",
  "skills.title": "\u5DE5\u4F5C\u6280\u80FD",
  "skills.empty": "\u5F53\u524D\u672A\u9009\u62E9\u5DE5\u4F5C\u6280\u80FD\u3002",
  "skills.restore": "\u7EE7\u7EED\u4F1A\u8BDD\u65F6\uFF0C\u6309\u4FDD\u5B58\u7684\u7248\u672C\u6062\u590D\u6240\u9009\u6280\u80FD\u3002",
  "skills.stale": "\u76EE\u6807\u5DF2\u53D8\u66F4\uFF0C\u8FD9\u7EC4\u6280\u80FD\u9700\u8981\u91CD\u65B0\u9009\u62E9\u3002",
  "skills.versions": "\u7248\u672C\u4FE1\u606F",
  "skills.revision": "\u6280\u80FD\u9009\u62E9\u7248\u672C\uFF1A{revision}",
  "skills.goalRevision": "\u5173\u8054\u76EE\u6807\u7248\u672C\uFF1A{revision}",
  "skills.unconfirmedGoal": "\u9009\u62E9\u65F6\u5C1A\u672A\u786E\u8BA4\u76EE\u6807",
  "skills.bytes": "{bytes} \u5B57\u8282",
  "view.chat": "\u8FD4\u56DE\u5BF9\u8BDD",
  loading: "\u6B63\u5728\u52A0\u8F7D\u56E2\u961F\u2026",
  unavailable: "Team \u6682\u4E0D\u53EF\u7528",
  "recovery.retry": "\u91CD\u65B0\u8BFB\u53D6\u56E2\u961F\u8BB0\u5F55",
  failure: "\u56E2\u961F\u6301\u4E45\u8BB0\u5F55\u65E0\u6548\uFF1A{message}",
  empty: "\u6682\u65E0\u5171\u4EAB\u4EFB\u52A1\uFF0C\u53EF\u4EE5\u901A\u8FC7\u5BF9\u8BDD\u521B\u5EFA",
  roster: "\u6210\u5458",
  tasks: "\u5171\u4EAB\u4EFB\u52A1",
  model: "\u6A21\u578B",
  parent: "\u4E0A\u7EA7",
  "workspace.eyebrow": "\u534F\u4F5C \xB7 \u8BB0\u5FC6 \xB7 \u4EA4\u4ED8",
  "workspace.title": "\u56E2\u961F\u5DE5\u4F5C\u53F0",
  "workspace.subtitle": "\u5BF9\u9F50\u804C\u8D23\uFF0C\u8BB0\u5F55\u8FDB\u5C55\uFF0C\u8BA9\u6BCF\u6B21\u5DE5\u4F5C\u63A5\u7EED\u4E0A\u4E00\u6B21\u3002",
  "workspace.navigation": "\u56E2\u961F\u89C6\u56FE",
  "workspace.overview": "\u5DE5\u4F5C\u6982\u89C8",
  "workspace.roles": "\u89D2\u8272\u4E0E\u6A21\u578B",
  "workspace.memory": "\u56E2\u961F\u8BB0\u5FC6",
  "workspace.close": "\u6536\u8D77",
  "workspace.completed": "\u5DF2\u5B8C\u6210\u4EFB\u52A1",
  "workspace.plan": "\u5B8C\u6574\u65B9\u6848",
  "workspace.noPlan": "\u5F53\u524D\u76EE\u6807\u8FD8\u6CA1\u6709\u56E2\u961F\u65B9\u6848\u3002",
  "workspace.details": "\u8BE6\u60C5",
  "workspace.inspect": "\u67E5\u770B\u6210\u5458\u8BE6\u60C5",
  "workspace.noDescription": "\u6682\u65E0\u804C\u8D23\u8BF4\u660E",
  "workspace.noSelection": "\u9009\u62E9\u6210\u5458\u6216\u4EFB\u52A1\u67E5\u770B\u8BE6\u60C5",
  "workspace.leadGroup": "\u961F\u957F\u534F\u8C03",
  "workspace.unassignedGroup": "\u5F85\u5206\u914D",
  "workspace.groupProgress": "{completed}/{total} \u5B8C\u6210",
  "workspace.groupMembers": "\u76F4\u5C5E\u4E0B\u7EA7",
  "workspace.modelSource": "\u6A21\u578B\u8BB0\u5F55",
  "task.result": "\u53EF\u590D\u7528\u7ED3\u679C",
  "task.recordedResult": "\u5DF2\u8BB0\u5F55\u6210\u679C",
  "task.evidence": "\u67E5\u770B\u4EA4\u4ED8\u7269\u4E0E\u9A8C\u8BC1\u8BB0\u5F55",
  "memory.title": "\u5171\u4EAB\u5DE5\u4F5C\u80CC\u666F",
  "memory.hint": "\u8FD9\u4E9B\u5DE5\u4F5C\u7B14\u8BB0\u968F\u56E2\u961F\u4FDD\u5B58\u3002\u5F53\u524D\u786E\u8BA4\u7684\u76EE\u6807\u4E0E\u6388\u6743\u4EE5\u201C\u76EE\u6807\u4E0E\u8303\u56F4\u201D\u9875\u4E3A\u51C6\u3002",
  "memory.empty": "\u5F00\u59CB\u4EFB\u52A1\u540E\uFF0C\u8D1F\u8D23\u4EBA\u4F1A\u5728\u8FD9\u91CC\u8BB0\u5F55\u76EE\u6807\u548C\u5173\u952E\u51B3\u7B56\u3002",
  "memory.none": "\u5C1A\u672A\u8BB0\u5F55",
  "memory.objective": "\u76EE\u6807\u4E0E\u9A8C\u6536\u8981\u6C42",
  "memory.authorization": "\u8303\u56F4\u7B14\u8BB0",
  "memory.decisions": "\u5DF2\u786E\u5B9A\u7684\u505A\u6CD5",
  "memory.historical": "\u5386\u53F2\u5DE5\u4F5C\u7B14\u8BB0 \xB7 \u6765\u81EA\u65E7\u76EE\u6807\uFF0C\u4FDD\u7559\u539F\u6587\u4F9B\u67E5\u9605\uFF1B\u5F53\u524D\u6267\u884C\u4E0D\u4F7F\u7528\u8FD9\u4E9B\u5185\u5BB9\u3002",
  "member.actions": "\u6210\u5458\u4E0E\u5DE5\u4F5C\u533A",
  "member.modelTitle": "\u4E0B\u6B21\u8BF7\u6C42\u7684\u6A21\u578B",
  "member.modelHint": "\u4FDD\u5B58\u540E\uFF0C\u6210\u5458\u4FDD\u7559\u73B0\u6709\u4F1A\u8BDD\u4E0E\u4EFB\u52A1\uFF0C\u4ECE\u4E0B\u6B21\u6A21\u578B\u8BF7\u6C42\u8D77\u4F7F\u7528\u65B0\u914D\u7F6E\u3002",
  "member.modelCatalogFailed": "\u6A21\u578B\u5217\u8868\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002",
  "member.unlistedRoute": "{name}\uFF08\u73B0\u6709\u914D\u7F6E\uFF0C\u6682\u672A\u5728\u76EE\u5F55\u4E2D\uFF09",
  "plan.none": "\u65E0",
  "member.retryModels": "\u91CD\u65B0\u8BFB\u53D6\u6A21\u578B",
  "member.highestEffort": "\u8BE5\u6A21\u578B\u652F\u6301\u7684\u6700\u9AD8\u601D\u8003\u5F3A\u5EA6",
  "member.saveModel": "\u4FDD\u5B58\u6210\u5458\u6A21\u578B",
  "member.modelSaved": "\u6A21\u578B\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u5C06\u4ECE\u4E0B\u6B21\u8BF7\u6C42\u8D77\u751F\u6548\u3002",
  "member.retire": "\u9000\u4F11\u6210\u5458",
  "member.reactivate": "\u6062\u590D\u6210\u5458",
  "member.retireHint": "\u53EA\u53EF\u9000\u4F11\u672A\u8FD0\u884C\u7684\u6210\u5458\uFF1B\u4F1A\u8BDD\u4E0E\u6210\u679C\u8BB0\u5F55\u4F1A\u4FDD\u7559\u3002",
  "member.retiredHint": "\u4F1A\u8BDD\u4E0E\u6210\u679C\u8BB0\u5F55\u5DF2\u4FDD\u7559\uFF1B\u6062\u590D\u4E0D\u4F1A\u81EA\u52A8\u53D1\u9001\u65B0\u4EFB\u52A1\u3002",
  "member.retired": "\u6210\u5458\u5DF2\u9000\u4F11\uFF0C\u5386\u53F2\u8BB0\u5F55\u4ECD\u53EF\u6253\u5F00\u3002",
  "member.reactivated": "\u6210\u5458\u5DF2\u6062\u590D\uFF1B\u9700\u8981\u65B0\u5DE5\u4F5C\u65F6\u518D\u53D1\u9001\u6D88\u606F\u3002",
  "member.workspaceLoading": "\u6B63\u5728\u8BFB\u53D6\u5DE5\u4F5C\u533A\u2026",
  "member.workspaceFailed": "\u5DE5\u4F5C\u533A\u4FE1\u606F\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6210\u5458\u3002",
  "member.sharedWorkspace": "\u6B64\u6210\u5458\u4F7F\u7528\u5171\u4EAB\u5DE5\u4F5C\u533A\u3002",
  "member.privateWorkspace": "\u6210\u5458\u79C1\u6709\u5DE5\u4F5C\u533A",
  "member.integrate": "\u96C6\u6210\u5DE5\u4F5C\u533A\u6539\u52A8",
  "member.integrateHint": "\u6210\u5458\u672A\u8FD0\u884C\u65F6\u53EF\u4EE5\u96C6\u6210\uFF1B\u5B8C\u6210\u540E\u4F1A\u5217\u51FA\u5B9E\u9645\u5199\u5165\u7684\u8DEF\u5F84\u3002",
  "member.integratedEmpty": "\u68C0\u67E5\u5B8C\u6210\uFF0C\u6CA1\u6709\u9700\u8981\u96C6\u6210\u7684\u6539\u52A8\u3002",
  "member.integratedPaths": "\u5DF2\u96C6\u6210\uFF1A{paths}",
  "member.actionFailed": "\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u8BF7\u68C0\u67E5\u6210\u5458\u72B6\u6001\u540E\u91CD\u8BD5\u3002",
  "archive.title": "\u5DF2\u5B8C\u6210\u4EFB\u52A1\u5F52\u6863",
  "archive.hint": "\u6309\u9700\u8BFB\u53D6\u5DF2\u5B8C\u6210\u4EFB\u52A1\u3002\u4F7F\u7528\u65E7\u6210\u679C\u524D\uFF0C\u8BF7\u91CD\u65B0\u6821\u9A8C\u8F93\u5165\u3001\u73AF\u5883\u4E0E\u4EA4\u4ED8\u7269\u3002",
  "archive.loading": "\u6B63\u5728\u8BFB\u53D6\u5F52\u6863\u2026",
  "archive.empty": "\u6682\u65E0\u5DF2\u5B8C\u6210\u4EFB\u52A1\u3002",
  "archive.loadFailed": "\u5F52\u6863\u8BFB\u53D6\u5931\u8D25\uFF0C\u53EF\u91CD\u8BD5\u3002",
  "archive.validateFailed": "\u6821\u9A8C\u672A\u5B8C\u6210\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
  "archive.validate": "\u91CD\u65B0\u6821\u9A8C\u53EF\u590D\u7528\u6027",
  "archive.unchecked": "\u5C1A\u672A\u91CD\u65B0\u6821\u9A8C\uFF0C\u4E0D\u80FD\u636E\u6B64\u8BA4\u5B9A\u6210\u679C\u4ECD\u53EF\u590D\u7528\u3002",
  "archive.reusable": "\u672C\u6B21\u6821\u9A8C\u53EF\u590D\u7528",
  "archive.stale": "\u672C\u6B21\u6821\u9A8C\u4E0D\u53EF\u590D\u7528",
  "archive.changed": "\u5F52\u6863\u8BB0\u5F55\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u540E\u518D\u5224\u65AD\u3002",
  "archive.more": "\u52A0\u8F7D\u66F4\u591A",
  "archive.previous": "\u4E0A\u4E00\u9875",
  "archive.retry": "\u91CD\u8BD5\u8BFB\u53D6",
  "archive.refresh": "\u5237\u65B0\u5F52\u6863",
  "roles.currentTeam": "\u5F53\u524D\u56E2\u961F",
  "roles.plannedTeam": "\u5F85\u786E\u8BA4\u7684\u6210\u5458\u65B9\u6848",
  "roles.noCurrentTeam": "\u5C1A\u65E0\u5F53\u524D\u6210\u5458",
  "roles.templates": "\u53EF\u590D\u7528\u89D2\u8272\u6A21\u677F",
  "roles.hint": "\u5148\u914D\u7F6E\u89D2\u8272\uFF0C\u56E2\u961F\u4F1A\u6309\u4EFB\u52A1\u9009\u62E9\u3002\u65B0\u6210\u5458\u7ED1\u5B9A\u521B\u5EFA\u65F6\u7684\u6A21\u578B\u3001\u4EBA\u8BBE\u548C\u89C4\u5219\uFF1B\u7F16\u8F91\u6A21\u677F\u5F71\u54CD\u4E4B\u540E\u521B\u5EFA\u7684\u6210\u5458\u3002\u8D1F\u8D23\u4EBA\u7684\u6A21\u578B\u53EF\u5728\u5BF9\u8BDD\u4E2D\u8C03\u6574\u3002",
  "roles.inherit": "\u7EE7\u627F\u4E0A\u7EA7\u6A21\u578B",
  "roles.add": "\u6DFB\u52A0\u89D2\u8272",
  "roles.remove": "\u79FB\u9664\u6A21\u677F",
  "roles.description": "\u804C\u8D23\u4E0E\u4E13\u957F",
  "roles.provider": "\u6A21\u578B\u670D\u52A1",
  "roles.persona": "\u4EBA\u8BBE \xB7 \u5982\u4F55\u601D\u8003\u4E0E\u534F\u4F5C",
  "roles.instructions": "AGENT.md \xB7 \u5DE5\u4F5C\u89C4\u5219\u4E0E\u4EA4\u4ED8\u8981\u6C42",
  "roles.noEffort": "\u4F7F\u7528\u6A21\u578B\u8BBE\u7F6E",
  "roles.defaultEffort": "\u6A21\u578B\u9ED8\u8BA4\u5F3A\u5EA6",
  "roles.save": "\u4FDD\u5B58\u89D2\u8272\u914D\u7F6E",
  "roles.saving": "\u6B63\u5728\u4FDD\u5B58\u2026",
  "roles.saved": "\u5DF2\u4FDD\u5B58\uFF0C\u65B0\u6210\u5458\u5C06\u4F7F\u7528\u8FD9\u4EFD\u914D\u7F6E",
  "roles.unsaved": "\u6709\u5C1A\u672A\u4FDD\u5B58\u7684\u7F16\u8F91",
  "roles.reload": "\u91CD\u65B0\u8BFB\u53D6\u5E76\u4FDD\u7559\u672C\u5730\u7F16\u8F91",
  "roles.persisted": "\u914D\u7F6E\u4FDD\u5B58\u5728\u672C\u673A\uFF0C\u91CD\u542F\u540E\u53EF\u7EE7\u7EED\u4F7F\u7528",
  "roles.invalid": "\u8BF7\u586B\u5199\u6BCF\u4E2A\u89D2\u8272\u7684\u804C\u8D23\u548C\u4EBA\u8BBE\u3002",
  "roles.invalidModel": "\u6240\u9009\u6A21\u578B\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6A21\u578B\u670D\u52A1\u548C\u6A21\u578B\u3002",
  "roles.invalidEffort": "\u601D\u8003\u5F3A\u5EA6\u4E0D\u5728\u8BE5\u6A21\u578B\u652F\u6301\u7684\u9009\u9879\u4E2D\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002",
  reasoningEffort: "\u601D\u8003\u5F3A\u5EA6",
  personaBound: "\u89D2\u8272\u5DF2\u7ED1\u5B9A",
  open: "\u6253\u5F00\u6210\u5458\u4F1A\u8BDD",
  current: "\u5F53\u524D\u4F1A\u8BDD",
  owner: "\u8D1F\u8D23\u4EBA",
  unowned: "\u672A\u5206\u914D",
  blockedBy: "\u4F9D\u8D56",
  writeScopes: "\u5199\u5165\u8303\u56F4",
  ready: "\u53EF\u5F00\u59CB",
  blocked: "\u88AB\u4F9D\u8D56\u963B\u585E",
  "task.expand": "\u5C55\u5F00",
  "task.collapse": "\u6536\u8D77",
  "memberStatus.running": "\u8FD0\u884C\u4E2D",
  "memberStatus.needsInput": "\u9700\u8981\u4F60\u5904\u7406",
  "memberStatus.inactive": "\u5F85\u547D",
  "memberStatus.provisioning": "\u51C6\u5907\u4E2D",
  "memberStatus.failed": "\u5931\u8D25",
  "memberStatus.retired": "\u5DF2\u9000\u4F11",
  "view.modelSource.recorded": "\u6700\u8FD1\u8BF7\u6C42",
  "view.modelSource.next": "\u4E0B\u6B21\u8BF7\u6C42",
  "view.modelSource.bound": "\u521B\u5EFA\u65F6\u914D\u7F6E",
  "view.nextModel": "\u4E0B\u6B21\u6A21\u578B\uFF1A{model}",
  "view.nextEffort": "\u4E0B\u6B21\u601D\u8003\u5F3A\u5EA6\uFF1A{effort}",
  "status.pending": "\u5F85\u5904\u7406",
  "status.in_progress": "\u8FDB\u884C\u4E2D",
  "status.completed": "\u5DF2\u5B8C\u6210"
};
var en = {
  "view.diagnostics": "Diagnostics & resources",
  "diagnostics.title": "Scheduling diagnostics",
  "diagnostics.hint": "Only observed Session metadata is shown. Export includes identifiers, versions and counts, with no goals, personas, skill bodies or connections.",
  "diagnostics.goal": "Goal revision",
  "diagnostics.provision": "Provisioning",
  "diagnostics.review": "Submissions awaiting review",
  "diagnostics.failed": "Failed member creations",
  "diagnostics.unknown": "Not observed",
  "diagnostics.health": "Check member tools and network through team_help tools / network. Registration still needs a harmless real invocation.",
  "diagnostics.cost": "Provider billing is not connected to this view; request counts are not converted into costs. A concurrency limit is not account capacity.",
  "diagnostics.export": "Export diagnostics (no prose)",
  "work.resourceBusy": "Waiting for an exclusive browser, device or account",
  "plan.resources": "Exclusive resources",
  "memberStatus.unknown": "Synchronizing",
  "view.group.coordination": "Communication & decisions",
  "view.group.experts": "Retained experts",
  "view.group.execution": "Execution & verification",
  "view.group.legacy": "Original-mode members",
  "view.taskSearch": "Search tasks, owners or outputs",
  "view.taskFilter": "Task status",
  "view.filter.all": "All",
  "view.filter.pending": "Pending",
  "view.filter.in_progress": "In progress",
  "view.filter.completed": "Accepted",
  "view.showMore": "Show more",
  "view.fullPlan": "Complete plan",
  "view.filteredTasks": "Showing {visible} / {total}",
  "view.compact": "Compact rows",
  "view.comfortable": "Comfortable rows",
  "view.isolationHint": "Members use private workspaces and checked publication. Full-access external tools require separate confinement.",
  "plan.automation": "Provisioning",
  "plan.onDemand": "On demand within the approved plan",
  "plan.manual": "Manual",
  "view.communicator": "Communicator",
  "view.retained": "Retained member",
  "view.expert": "Long-term expert",
  "view.summary": "Team activity",
  "view.teamCount": "Team members",
  "view.legacyCount": "Mode subagents",
  "view.noActiveTasks": "No active tasks",
  "view.openArchive": "View archived tasks",
  "view.completedHint": "{count} completed tasks retain their artifacts and reviews in the archive",
  "plan.roster": "Planned members \xB7 Configuration at confirmation",
  "plan.rosterHint": "This is the saved plan; inspect members for the actual request configuration",
  "plan.retain": "Retain history",
  "plan.replan": "Replan under the new goal",
  "plan.skills": "Selected skills",
  "plan.owner": "Executor",
  "plan.reviewer": "Independent reviewer",
  "plan.dependencies": "Dependencies",
  "plan.inputs": "Input files",
  "plan.outputs": "Output scopes",
  "plan.dual": "Independent verification and planning/quality adviser review",
  "plan.independent": "Independent review",
  "plan.budget": "Resource budget",
  "plan.members": "Maximum subordinate members",
  "plan.requests": "Concurrent model requests",
  "plan.recovery": "Failure and recovery",
  "plan.previous": "Previous tasks",
  "member.roleTitle": "Team responsibility",
  "member.roleHint": "Change an idle member\u2019s responsibility while retaining its Session, persona, skills, and results. Earlier adviser findings require a fresh review.",
  "member.roleUnset": "No responsibility assigned",
  "member.roleReason": "Reason for this change",
  "member.saveRole": "Save responsibility",
  "member.roleSaved": "Responsibility saved",
  "work.blocker.goal": "Goal changed \xB7 Review the existing plan and results",
  "work.blocker.dependencies": "Waiting for accepted dependencies",
  "work.blocker.reviewer_missing": "Independent reviewer needed",
  "work.blocker.adviser_review": "Waiting for both adviser reviews",
  "work.blocker.skills": "Current-goal skills needed",
  "work.blocker.manual": "Waiting for assignment or dispatch opt-in",
  "view.legacy.one-shot": "Original mode \xB7 one-shot (results belong to its workflow)",
  "view.legacy.continuable": "Original mode \xB7 continuable",
  "view.legacy.unknown": "Original mode \xB7 open the Session to inspect its status",
  trigger: "Agent Team",
  "goals.executionScope": "Resources available to tools",
  "goals.readPaths": "Readable files or directories",
  "goals.writePaths": "Writable files or directories",
  "goals.webOrigins": "Permitted web origins",
  "goals.allowSearch": "Allow public web search",
  "goals.allowUnrestrictedExecution": "Allow commands and programs to access unrestricted resources",
  "goals.executionHint": "One entry per line. Paths are relative to the member workspace: \u201C.\u201D means the workspace and \u201C*\u201D means unrestricted. Use complete origins such as https://example.com. Commands and PTC cannot restrict network destinations by URL; enabling them requires an explicit \u201C*\u201D in all three resource lists. File sandbox ceilings still apply. For partial scope, use native tools whose resources can be checked individually.",
  "goals.enabled": "Allowed",
  "goals.disabled": "Not allowed",
  "work.details": "Execution versions and review",
  "work.input": "Input version",
  "work.environment": "Environment version",
  "work.goal": "Goal revision",
  "work.plan": "Plan revision",
  "work.attempt": "Executions",
  "work.criteria": "Acceptance criteria",
  "work.submission": "Submitted result",
  "work.review": "Independent review",
  "work.adviserGate": "Dual adviser review",
  "work.adviserPending": "Pending",
  "work.adviserApproved": "Approved",
  "work.adviserRevise": "Revision requested",
  "work.legacy": "Historical completion; input versions and acceptance evidence have not been checked.",
  "work.declaredVersions": "These are declared versions and recorded reviews. Check the actual files and environment before reuse.",
  "work.stale": "Needs revalidation",
  "work.goalChanged": "Earlier goal version; replan before execution",
  "work.phase.pending": "Pending execution",
  "work.phase.running": "Executing",
  "work.phase.submitted": "Awaiting independent review",
  "work.phase.accepted": "Review accepted",
  "work.phase.rejected": "Needs revision",
  "work.phase.cancelled": "Execution ended",
  "work.ownerInactive": "Member Session is not running; resume work",
  "work.ownerUnknown": "Session activity unknown; check status",
  "work.recovery.resume": "Member Session ended; resume execution",
  "work.recovery.reconcile": "Member Session ended; inspect existing changes",
  "work.recovery.review": "Awaiting independent review",
  "work.recovery.inspect": "Member Session ended; inspect execution",
  "work.duplicateSubject": "Same subject; review each task ID separately",
  "work.openTasks": "Open tasks",
  "view.title": "Team",
  "view.subtitle": "One objective, with progress retained.",
  "view.settings": "Team settings",
  "view.backToMembers": "Back to members",
  "view.goal": "Objective",
  "view.scope": "View objective and scope",
  "view.members": "Members",
  "view.memberTree": "Team member tree",
  "view.groupTasks": "Grouped tasks",
  "view.inspectGroupMember": "Inspect group member {name}",
  "view.taskDetail": "Task details",
  "view.tasks": "Tasks",
  "view.memory": "Memory",
  "view.experts": "Experts",
  "view.goals": "Goal and scope",
  "view.mailbox": "Messages",
  "mailbox.hint": "Review Team message delivery. Historical messages stay outside new goals until the Lead explicitly adopts them.",
  "mailbox.refresh": "Refresh",
  "mailbox.loading": "Loading messages\u2026",
  "mailbox.empty": "No Team messages",
  "mailbox.loadFailed": "Could not load messages. Refresh to retry.",
  "mailbox.detailFailed": "Could not load message details. Open it again.",
  "mailbox.actionFailed": "The action did not finish. The message is retained; check its status and retry.",
  "mailbox.accepted": "Message delivered.",
  "mailbox.queued": "Message retained for delivery.",
  "mailbox.status.pending": "Awaiting delivery",
  "mailbox.status.quarantined": "Historical",
  "mailbox.status.delivered": "Delivered",
  "mailbox.status.retry-exhausted": "Automatic retries exhausted",
  "mailbox.unversioned": "No goal revision",
  "mailbox.goalRevision": "Goal revision {revision}",
  "mailbox.retry": "Retry delivery",
  "mailbox.adopt": "Adopt into current goal",
  "mailbox.exhausted": "{attempts} attempts; you can retry manually.",
  "mailbox.loadingDetail": "Loading details\u2026",
  "mailbox.id": "Message ID",
  "mailbox.adoptedFrom": "Adopted from",
  "mailbox.nonText": "Non-text content; view it in the member conversation.",
  "mailbox.pagination": "Message pages",
  "mailbox.previous": "Previous",
  "mailbox.next": "Next",
  "mailbox.range": "Showing {start}\u2013{end} of {total}",
  "goals.hint": "Goals and scope take effect after your confirmation. Changes stay in the conversation history.",
  "goals.unconfirmed": "Awaiting confirmation",
  "goals.active": "Confirmed \xB7 Revision {revision}",
  "goals.revoked": "Revoked \xB7 Revision {revision}",
  "goals.revokedShort": "Goal revoked",
  "goals.revokedHint": "The goal was revoked. New Team operations are blocked until you confirm a new goal.",
  "goals.empty": "Define the goal, scope, and acceptance criteria before confirming Team work.",
  "goals.objective": "Task objective",
  "goals.plan": "Complete Team plan",
  "goals.planHint": "Use the project_plan structure for members, configured routes, efforts, roles, skills, tasks, dependencies, outputs and resource budgets. The complete plan has labelled groups; advanced editing retains JSON.",
  "goals.acceptanceCriteria": "Acceptance criteria",
  "goals.coverage": "Scope coverage",
  "goals.coverage.task": "This task only",
  "goals.coverage.partial": "Partial authorization",
  "goals.coverage.full": "Full authorization within the listed scope",
  "goals.coverageHint": "Full authorization still follows the targets, actions, and constraints listed here.",
  "goals.targets": "Targets",
  "goals.allowedActions": "Allowed actions",
  "goals.excludedTargets": "Excluded targets",
  "goals.constraints": "Other constraints",
  "goals.linesHint": "Enter one item per line below. Criteria, targets, and allowed actions are required.",
  "goals.pending": "Proposal awaiting review \xB7 Revision {revision}",
  "goals.proposalDetails": "View the complete proposal",
  "goals.review": "Review and confirm",
  "goals.rejected": "The proposal was not accepted. The current goal is unchanged.",
  "goals.reviewing": "Review the scope in the conversation confirmation card. You can switch back to the conversation to answer.",
  "goals.create": "Set a goal",
  "goals.edit": "Edit goal",
  "goals.restore": "Confirm a new goal",
  "goals.revoke": "Revoke goal\u2026",
  "goals.revocation": "Revocation proposal",
  "goals.reason": "Reason for revocation",
  "goals.editing": "Edit proposal",
  "goals.saving": "Saving\u2026",
  "goals.saveAndReview": "Save proposal and review",
  "goals.cancelEdit": "Discard these edits",
  "goals.keepDraft": "I reviewed the latest scope; keep my edits",
  "goals.conflict": "The goal or proposal changed. Your edits are retained; review the latest records above before continuing.",
  "goals.alreadyReviewing": "A confirmation card is already waiting. Continue the review in the conversation.",
  "goals.noReviewer": "No confirmation interface is available on this connection. The proposal is retained; reconnect and retry.",
  "goals.invalid": "Enter an objective and at least one acceptance criterion, target, and allowed action.",
  "goals.tooLarge": "The proposal exceeds the plugin\u2019s configured size limit. Shorten it and retry.",
  "goals.reasonRequired": "Enter a reason for revocation.",
  "goals.failed": "The operation did not finish. Saved proposals and current edits are retained; try again.",
  "experts.hint": "Retain expert responsibilities, personas, and skills for reuse. After saving a profile, assign work through the conversation.",
  "experts.search": "Search experts",
  "experts.showArchived": "Show archived",
  "experts.untitled": "New expert",
  "experts.archived": "Archived",
  "experts.unsaved": "Unsaved changes",
  "experts.saved": "Saved",
  "experts.empty": "No matching experts",
  "experts.add": "Add expert",
  "experts.refresh": "Refresh catalog",
  "experts.name": "Expert name",
  "experts.revision": "Revision {revision}",
  "experts.newRevision": "Catalog revision {revision} is available. Your edits are retained.",
  "experts.reloadSelected": "Discard these edits and load the latest revision",
  "experts.modelHint": "Context and output lengths follow this model\u2019s DSH configuration.",
  "experts.skills": "Skill references \xB7 One name per line",
  "experts.skillsHint": "Enter installed skill names. These references use skill content loaded by DSH.",
  "experts.archive": "Archive expert (retain profile and conversations; reversible)",
  "experts.save": "Save expert",
  "experts.bindings": "Conversations in this Team",
  "experts.bindingHint": "Existing members retain their bound profile revision and working history.",
  "experts.unassigned": "This Team has not assigned this expert.",
  "experts.select": "Select an expert or add a new one.",
  "experts.invalid": "Enter a name, responsibility (up to 200 characters), and persona. Check the skill and model selections.",
  "experts.loadFailed": "The expert catalog could not load. Refresh to retry.",
  "experts.saveFailed": "Saving failed. Your edits are retained; try again.",
  "experts.conflict": "This profile changed elsewhere. Your edits are retained; review the latest revision.",
  "view.work": "Current work",
  "view.status": "Status",
  "view.search": "Search members",
  "view.noMatches": "No matching members",
  "view.noTask": "No assigned task",
  "view.sessionModel": "Session model",
  "view.descendant": "Nested teammate",
  "view.longTermMember": "Long-term member",
  "view.boundExpert": "Long-term expert \xB7 profile bound",
  "view.function.planningAdviser": "Planning adviser",
  "view.function.qualityAdviser": "Quality adviser",
  "view.function.domainAdviser": "Domain adviser",
  "view.function.groupLead": "Group lead",
  "view.function.executor": "Executor",
  "view.function.verifier": "Independent verifier",
  "view.memberCount": "Showing {visible} / {total} members",
  "view.memberHint": "Select a member to view their role, records, and past tasks",
  "view.memberDetail": "Member details",
  "view.boundRevision": "Bound expert profile revision: {revision}",
  "view.persona": "Role and working instructions",
  "view.memberTasks": "Assigned tasks",
  "view.reviewer": "Independent reviewer",
  "view.autoAssign": "Automatic assignment",
  "view.requiredSkill": "Required skill",
  "view.enabled": "Enabled",
  "view.disabled": "Disabled",
  "skills.title": "Working skills",
  "skills.empty": "No working skills are selected.",
  "skills.restore": "Selected skills are restored from their saved versions when the conversation continues.",
  "skills.stale": "The goal has changed. Select applicable skills again.",
  "skills.versions": "Version details",
  "skills.revision": "Skill selection revision: {revision}",
  "skills.goalRevision": "Associated goal revision: {revision}",
  "skills.unconfirmedGoal": "No goal was confirmed when these skills were selected",
  "skills.bytes": "{bytes} bytes",
  "view.chat": "Back to conversation",
  loading: "Loading Team\u2026",
  unavailable: "Team is unavailable",
  "recovery.retry": "Reload Team record",
  failure: "Invalid persisted Team record: {message}",
  empty: "No shared tasks yet. Create them through the conversation.",
  roster: "Members",
  tasks: "Shared tasks",
  model: "Model",
  parent: "Parent",
  "workspace.eyebrow": "COLLABORATION \xB7 MEMORY \xB7 DELIVERY",
  "workspace.title": "Team workspace",
  "workspace.subtitle": "Align responsibilities, retain progress, and continue from completed work.",
  "workspace.navigation": "Team views",
  "workspace.overview": "Overview",
  "workspace.roles": "Roles and models",
  "workspace.memory": "Team memory",
  "workspace.close": "Close",
  "workspace.completed": "Completed tasks",
  "workspace.plan": "Complete plan",
  "workspace.noPlan": "The current goal has no Team plan yet.",
  "workspace.details": "Details",
  "workspace.inspect": "Inspect member",
  "workspace.noDescription": "No role description yet",
  "workspace.noSelection": "Select a member or task for details",
  "workspace.leadGroup": "Lead coordination",
  "workspace.unassignedGroup": "Unassigned",
  "workspace.groupProgress": "{completed}/{total} complete",
  "workspace.groupMembers": "Direct reports",
  "workspace.modelSource": "Model record",
  "task.result": "Reusable result",
  "task.recordedResult": "Recorded result",
  "task.evidence": "View artifacts and verification",
  "memory.title": "Shared working context",
  "memory.hint": "These working notes stay with the Team. See Goal and scope for the current confirmed objective and authorization.",
  "memory.empty": "The Lead records the objective and key decisions when work begins.",
  "memory.none": "Not recorded yet",
  "memory.objective": "Objective and acceptance criteria",
  "memory.authorization": "Scope notes",
  "memory.decisions": "Recorded decisions",
  "memory.historical": "Historical work note \xB7 Retained from an earlier goal for reference. Current execution does not use this text.",
  "member.actions": "Member and workspace",
  "member.modelTitle": "Model for the next request",
  "member.modelHint": "The member keeps its conversation and tasks. The new route applies from its next model request.",
  "member.modelCatalogFailed": "Could not load models. Try again.",
  "member.unlistedRoute": "{name} (existing route, currently unlisted)",
  "plan.none": "None",
  "member.retryModels": "Reload models",
  "member.highestEffort": "Highest supported effort",
  "member.saveModel": "Save member model",
  "member.modelSaved": "Model saved for the next request.",
  "member.retire": "Retire member",
  "member.reactivate": "Reactivate member",
  "member.retireHint": "Only an inactive member can retire. Its conversation and results remain available.",
  "member.retiredHint": "Conversation and results are retained. Reactivating sends no new task.",
  "member.retired": "Member retired. Its history remains available.",
  "member.reactivated": "Member reactivated. Send a message when new work is needed.",
  "member.workspaceLoading": "Loading workspace\u2026",
  "member.workspaceFailed": "Could not read the workspace. Select the member again.",
  "member.sharedWorkspace": "This member uses the shared workspace.",
  "member.privateWorkspace": "Private member workspace",
  "member.integrate": "Integrate workspace changes",
  "member.integrateHint": "Integration is available while the member is inactive. The paths actually written appear afterward.",
  "member.integratedEmpty": "Check complete; no changes needed integration.",
  "member.integratedPaths": "Integrated: {paths}",
  "member.actionFailed": "The action did not finish. Check member status and retry.",
  "archive.title": "Completed-task archive",
  "archive.hint": "Load completed tasks when needed. Revalidate inputs, environment, and artifacts before using earlier results.",
  "archive.loading": "Loading archive\u2026",
  "archive.empty": "No completed tasks yet.",
  "archive.loadFailed": "Could not load the archive. Retry.",
  "archive.validateFailed": "Validation did not finish. Retry later.",
  "archive.validate": "Revalidate for reuse",
  "archive.unchecked": "Not revalidated; this result cannot yet be treated as reusable.",
  "archive.reusable": "Reusable in this check",
  "archive.stale": "Not reusable in this check",
  "archive.changed": "This archive record changed. Reload it before deciding whether to reuse it.",
  "archive.more": "Load more",
  "archive.previous": "Previous page",
  "archive.retry": "Retry loading",
  "archive.refresh": "Refresh archive",
  "roles.currentTeam": "Current Team",
  "roles.plannedTeam": "Proposed member plan",
  "roles.noCurrentTeam": "No current members",
  "roles.templates": "Reusable role templates",
  "roles.hint": "Configure roles for task-driven selection. New members retain their creation-time model, persona, and rules. Template edits apply to later members. Change the Lead model in the conversation.",
  "roles.inherit": "Inherit parent model",
  "roles.add": "Add role",
  "roles.remove": "Remove template",
  "roles.description": "Responsibility and expertise",
  "roles.provider": "Model service",
  "roles.persona": "Persona \xB7 Thinking and collaboration",
  "roles.instructions": "AGENT.md \xB7 Working rules and deliverables",
  "roles.noEffort": "Use model settings",
  "roles.defaultEffort": "Model default effort",
  "roles.save": "Save role configuration",
  "roles.saving": "Saving\u2026",
  "roles.saved": "Saved for newly created members",
  "roles.unsaved": "Unsaved edits",
  "roles.reload": "Reload and keep local edits",
  "roles.persisted": "Configuration is stored locally and survives restart",
  "roles.invalid": "Enter a responsibility and persona for every role.",
  "roles.invalidModel": "The selected model is unavailable. Select a service and model again.",
  "roles.invalidEffort": "Select a reasoning effort supported by this model.",
  reasoningEffort: "Reasoning",
  personaBound: "Role bound",
  open: "Open member conversation",
  current: "Current chat",
  owner: "Owner",
  unowned: "Unowned",
  blockedBy: "Blocked by",
  writeScopes: "Write scopes",
  ready: "Ready",
  blocked: "Blocked by dependencies",
  "task.expand": "Show more",
  "task.collapse": "Show less",
  "memberStatus.running": "Running",
  "memberStatus.needsInput": "Needs your input",
  "memberStatus.inactive": "Standby",
  "memberStatus.provisioning": "Provisioning",
  "memberStatus.failed": "Failed",
  "memberStatus.retired": "Retired",
  "view.modelSource.recorded": "Last request",
  "view.modelSource.next": "Next request",
  "view.modelSource.bound": "Creation setting",
  "view.nextModel": "Next model: {model}",
  "view.nextEffort": "Next reasoning: {effort}",
  "status.pending": "Pending",
  "status.in_progress": "In progress",
  "status.completed": "Completed"
};

// packages/team/modules/ui/lib/types/client/role-settings.js
function readProfiles(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Team role settings must be an object");
  const profiles = value["memberProfiles"] === void 0 ? {} : value["memberProfiles"];
  if (profiles === null || typeof profiles !== "object" || Array.isArray(profiles))
    throw new Error("Team memberProfiles must be an object");
  const result = {};
  for (const [id, profile] of Object.entries(profiles)) {
    if (profile === null || typeof profile !== "object" || Array.isArray(profile) || typeof profile["description"] !== "string" || typeof profile["persona"] !== "string" || typeof profile["instructions"] !== "string")
      throw new Error(`Invalid Team role ${id}`);
    const modelProvider = profile["modelProvider"];
    const model = profile["model"];
    const reasoningEffort = profile["reasoningEffort"];
    if (modelProvider !== void 0 && typeof modelProvider !== "string" || model !== void 0 && typeof model !== "string" || reasoningEffort !== void 0 && typeof reasoningEffort !== "string")
      throw new Error(`Invalid model settings for Team role ${id}`);
    result[id] = {
      description: profile["description"],
      persona: profile["persona"],
      instructions: profile["instructions"],
      ...modelProvider === void 0 ? {} : { modelProvider },
      ...model === void 0 ? {} : { model },
      ...reasoningEffort === void 0 ? {} : { reasoningEffort }
    };
  }
  return result;
}
function createTeamRoleOperations(ctx) {
  return {
    async loadRoles() {
      const [settings, catalog] = await Promise.all([ctx.remote.settings.describe(), ctx.remote.session.modelCatalog()]);
      if (!settings.ok)
        throw new Error(settings.error.message);
      if (!catalog.ok)
        throw new Error(catalog.error.message);
      const namespace = settings.value.namespaces.find((value) => value.ns === "tool-agent-team");
      if (namespace === void 0)
        throw new Error("Team role settings are unavailable");
      return { revision: namespace.revision, profiles: readProfiles(namespace.value), catalog: catalog.value };
    },
    async saveRoles(profiles, revision) {
      const value = {};
      for (const [id, profile] of Object.entries(profiles))
        value[id] = { ...profile };
      const response = await ctx.remote.settings.mutate("tool-agent-team", [{ op: "set", path: ["memberProfiles"], value }], revision);
      if (!response.ok)
        throw new Error(response.error.message);
      return response.value.revision;
    }
  };
}

// packages/team/modules/ui/lib/types/client/expert-catalog.js
function createTeamExpertOperations(ctx) {
  return {
    async load(signal) {
      signal.throwIfAborted();
      const [profiles, models] = await Promise.all([ctx.remote.teamExperts.list(true), ctx.remote.session.modelCatalog()]);
      signal.throwIfAborted();
      if (!profiles.ok)
        throw profiles.error;
      if (!models.ok)
        throw models.error;
      return { profiles: profiles.value, models: models.value };
    },
    async save(definition, previous, archived, signal) {
      const result = previous === null ? await ctx.remote.teamExperts.create(definition, signal) : await ctx.remote.teamExperts.update(previous.id, previous.revision, definition, archived, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    }
  };
}

// packages/team/modules/ui/lib/types/client/goal-operations.js
function createTeamGoalOperations(ctx, leadSessionId) {
  const lifetime = new AbortController();
  ctx.effect(() => () => {
    lifetime.abort();
  }, "client-ui-agent-team: goal reviews");
  return {
    async propose(sessionId, request, signal) {
      const result = await ctx.remote.agentTeams.proposeGoal(leadSessionId(sessionId), request, AbortSignal.any([signal, lifetime.signal]));
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async review(sessionId, proposalRevision) {
      const result = await ctx.remote.agentTeams.reviewGoal(leadSessionId(sessionId), proposalRevision, lifetime.signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    }
  };
}

// packages/team/modules/ui/lib/types/client/mailbox-operations.js
function createTeamMailboxOperations(ctx, leadSessionId) {
  return {
    async list(sessionId, offset, limit) {
      const result = await ctx.remote.agentTeams.listMessagePage(leadSessionId(sessionId), offset, limit);
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async get(sessionId, messageId) {
      const result = await ctx.remote.agentTeams.getMessage(leadSessionId(sessionId), messageId);
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async retry(sessionId, messageId, signal) {
      const result = await ctx.remote.agentTeams.retryMessage(leadSessionId(sessionId), messageId, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async adopt(sessionId, messageId, signal) {
      const result = await ctx.remote.agentTeams.adoptMessage(leadSessionId(sessionId), messageId, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    }
  };
}

// packages/team/modules/ui/lib/types/client/member-operations.js
function createTeamMemberOperations(ctx, leadSessionId) {
  return {
    async models() {
      const result = await ctx.remote.session.modelCatalog();
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async configureRole(sessionId, request, signal) {
      const result = await ctx.remote.agentTeams.configureMemberRole(leadSessionId(sessionId), request, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async configureModel(sessionId, request, signal) {
      const result = await ctx.remote.agentTeams.configureMemberModel(leadSessionId(sessionId), request, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async retire(sessionId, target, signal) {
      const result = await ctx.remote.agentTeams.retireMember(leadSessionId(sessionId), target, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async reactivate(sessionId, target, signal) {
      const result = await ctx.remote.agentTeams.reactivateMember(leadSessionId(sessionId), target, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async workspace(sessionId, target) {
      const result = await ctx.remote.agentTeams.getWorkspace(leadSessionId(sessionId), target);
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async integrate(sessionId, target, signal) {
      const result = await ctx.remote.agentTeams.integrateWorkspace(leadSessionId(sessionId), target, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    }
  };
}

// packages/team/modules/ui/lib/types/client/task-operations.js
function createTeamTaskOperations(ctx, leadSessionId) {
  return {
    async archive(sessionId, after, limit) {
      const result = await ctx.remote.agentTeams.listTaskArchive(leadSessionId(sessionId), {
        ...after === void 0 ? {} : { after },
        limit
      });
      if (!result.ok)
        throw result.error;
      return result.value;
    },
    async validateReuse(sessionId, id, signal) {
      const result = await ctx.remote.agentTeams.validateTaskReuse(leadSessionId(sessionId), id, signal);
      if (!result.ok)
        throw result.error;
      return result.value;
    }
  };
}

// packages/team/modules/ui/lib/types/client/TeamView.js
var import_jsx_runtime14 = require("react/jsx-runtime");
var import_react10 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// packages/team/modules/ui/lib/types/client/TeamExperts.js
var import_jsx_runtime7 = require("react/jsx-runtime");
var import_react4 = require("react");
var import_client2 = require("@deepseek-ai/dsh-api-gateway/client");

// packages/team/modules/ui/lib/types/client/TeamExperts.module.css
var TeamExperts_default = {
  catalog: "TeamExperts_catalog",
  hint: "TeamExperts_hint",
  error: "TeamExperts_error",
  layout: "TeamExperts_layout",
  sidebar: "TeamExperts_sidebar",
  editor: "TeamExperts_editor",
  choices: "TeamExperts_choices",
  choice: "TeamExperts_choice",
  actions: "TeamExperts_actions",
  footer: "TeamExperts_footer",
  editorHeader: "TeamExperts_editorHeader",
  binding: "TeamExperts_binding",
  fields: "TeamExperts_fields",
  field: "TeamExperts_field",
  instructions: "TeamExperts_instructions",
  checkbox: "TeamExperts_checkbox",
  models: "TeamExperts_models",
  button: "TeamExperts_button",
  primaryButton: "TeamExperts_primaryButton",
  textButton: "TeamExperts_textButton",
  bindings: "TeamExperts_bindings",
  conflict: "TeamExperts_conflict"
};

// packages/team/modules/ui/lib/types/client/TeamExperts.js
function fromProfile(profile) {
  return { base: profile, definition: profile.definition, skillsText: profile.definition.skills.join("\n"), archived: profile.archived };
}
function definitionOf(draft) {
  return { ...draft.definition, skills: draft.skillsText.split("\n").map((value) => value.trim()).filter(Boolean) };
}
function isEdited(draft) {
  return draft.base === null || draft.archived !== draft.base.archived || JSON.stringify(definitionOf(draft)) !== JSON.stringify(draft.base.definition);
}
function TeamExperts({ operations, members, openMember, t }) {
  const [catalog, setCatalog] = (0, import_react4.useState)(null);
  const [drafts, setDrafts] = (0, import_react4.useState)({});
  const [selected, setSelected] = (0, import_react4.useState)("");
  const [search, setSearch] = (0, import_react4.useState)("");
  const [showArchived, setShowArchived] = (0, import_react4.useState)(false);
  const [reload, setReload] = (0, import_react4.useState)(0);
  const [loading, setLoading] = (0, import_react4.useState)(true);
  const [saving, setSaving] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)(null);
  const request = (0, import_react4.useRef)(null);
  const nextDraft = (0, import_react4.useRef)(0);
  const formId = (0, import_react4.useId)();
  (0, import_react4.useEffect)(() => {
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    void operations.load(controller.signal).then((value) => {
      if (controller.signal.aborted)
        return;
      setCatalog(value);
      setDrafts((current) => {
        const next = { ...current };
        for (const profile2 of value.profiles) {
          const draft2 = next[profile2.id];
          if (draft2 === void 0 || !isEdited(draft2))
            next[profile2.id] = fromProfile(profile2);
        }
        return next;
      });
      setSelected((current) => current || value.profiles.find((profile2) => !profile2.archived)?.id || "");
    }).catch((reason) => {
      if (controller.signal.aborted)
        return;
      if (!(0, import_client2.isRemoteFailure)(reason))
        throw reason;
      setError(t("experts.loadFailed"));
    }).finally(() => {
      if (!controller.signal.aborted)
        setLoading(false);
    });
    return () => {
      controller.abort();
    };
  }, [operations, reload, t]);
  const draft = drafts[selected];
  const profile = draft?.definition;
  const provider = catalog?.models.groups.find((group) => group.id === profile?.modelProvider);
  const model = provider?.models.find((value) => value.id === profile?.model);
  const busy = loading || saving;
  const latest = catalog?.profiles.find((value) => value.id === draft?.base?.id);
  const bindings = members.flatMap((member) => member.expert !== void 0 && member.expert.id === draft?.base?.id ? [{ member, revision: member.expert.revision }] : []);
  const needle = search.trim().toLocaleLowerCase();
  const choices = Object.entries(drafts).filter(([key, value]) => (showArchived || !value.archived || key === selected) && [value.definition.name, value.definition.description, value.definition.model, ...value.definition.skills].some((text2) => text2?.toLocaleLowerCase().includes(needle)));
  const change = (next) => {
    setDrafts((current) => ({ ...current, [selected]: next }));
    setError(null);
  };
  const update = (next) => {
    if (draft !== void 0)
      change({ ...draft, definition: next });
  };
  const save = async () => {
    const signal = request.current?.signal;
    if (draft === void 0 || signal === void 0 || busy)
      return;
    const cancelled = () => signal.aborted;
    if (cancelled())
      return;
    const definition = definitionOf(draft);
    if ([definition.name, definition.description, definition.persona].some((value) => value.trim() === "")) {
      setError(t("experts.invalid"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await operations.save(definition, draft.base, draft.archived, signal);
      if (cancelled())
        return;
      setDrafts((current) => {
        const next = Object.fromEntries(Object.entries(current).filter(([key]) => key !== selected));
        next[saved.id] = fromProfile(saved);
        return next;
      });
      setCatalog((current) => current === null ? null : {
        ...current,
        profiles: [...current.profiles.filter((value) => value.id !== saved.id), saved]
      });
      setSelected((current) => current === selected ? saved.id : current);
    } catch (reason) {
      if (cancelled())
        return;
      if (!(0, import_client2.isRemoteFailure)(reason))
        throw reason;
      if (reason.code === "team-expert/stale-revision") {
        setError(t("experts.conflict"));
        setReload((value) => value + 1);
      } else {
        setError(t(reason.code === "team-expert/model-unavailable" ? "roles.invalidModel" : reason.code === "team-expert/invalid-profile" ? "experts.invalid" : "experts.saveFailed"));
      }
    } finally {
      if (!cancelled())
        setSaving(false);
    }
  };
  return (0, import_jsx_runtime7.jsxs)("section", { className: TeamExperts_default.catalog, "aria-label": t("view.experts"), children: [(0, import_jsx_runtime7.jsx)("p", { className: TeamExperts_default.hint, children: t("experts.hint") }), error !== null && (0, import_jsx_runtime7.jsx)("p", { role: "alert", className: TeamExperts_default.error, children: error }), loading && (0, import_jsx_runtime7.jsx)("p", { role: "status", className: TeamExperts_default.hint, children: t("loading") }), (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.layout, children: [(0, import_jsx_runtime7.jsxs)("aside", { className: TeamExperts_default.sidebar, children: [(0, import_jsx_runtime7.jsx)("input", { type: "search", "aria-label": t("experts.search"), placeholder: t("experts.search"), value: search, onChange: (event) => {
    setSearch(event.target.value);
  } }), (0, import_jsx_runtime7.jsxs)("label", { className: TeamExperts_default.checkbox, children: [(0, import_jsx_runtime7.jsx)("input", { type: "checkbox", checked: showArchived, onChange: (event) => {
    setShowArchived(event.target.checked);
  } }), t("experts.showArchived")] }), (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.choices, children: [choices.map(([key, value]) => (0, import_jsx_runtime7.jsxs)("button", { type: "button", className: TeamExperts_default.choice, "aria-pressed": key === selected, onClick: () => {
    setSelected(key);
    setError(null);
  }, children: [(0, import_jsx_runtime7.jsx)("strong", { children: value.definition.name || t("experts.untitled") }), (0, import_jsx_runtime7.jsx)("span", { children: value.definition.description || t("roles.description") }), (0, import_jsx_runtime7.jsxs)("small", { children: [value.archived ? t("experts.archived") : value.definition.model ?? t("roles.inherit"), isEdited(value) ? ` \xB7 ${t("experts.unsaved")}` : ""] })] }, key)), !loading && choices.length === 0 && (0, import_jsx_runtime7.jsx)("p", { className: TeamExperts_default.hint, children: t("experts.empty") })] }), (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.actions, children: [(0, import_jsx_runtime7.jsx)("button", { className: TeamExperts_default.button, type: "button", disabled: busy, onClick: () => {
    const key = `draft:${++nextDraft.current}`;
    setDrafts((current) => ({ ...current, [key]: {
      base: null,
      definition: { name: "", description: "", persona: "", instructions: "", skills: [] },
      skillsText: "",
      archived: false
    } }));
    setSelected(key);
    setSearch("");
    setError(null);
  }, children: t("experts.add") }), (0, import_jsx_runtime7.jsx)("button", { className: TeamExperts_default.textButton, type: "button", disabled: busy, onClick: () => {
    setError(null);
    setReload((value) => value + 1);
  }, children: t("experts.refresh") })] })] }), draft !== void 0 && profile !== void 0 ? (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.editor, children: [(0, import_jsx_runtime7.jsxs)("header", { className: TeamExperts_default.editorHeader, children: [(0, import_jsx_runtime7.jsx)("h2", { children: profile.name || t("experts.untitled") }), (0, import_jsx_runtime7.jsx)("span", { className: TeamExperts_default.hint, children: draft.base === null ? t("experts.unsaved") : t("experts.revision", { revision: draft.base.revision }) })] }), latest !== void 0 && draft.base !== null && latest.revision !== draft.base.revision && (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.conflict, children: [(0, import_jsx_runtime7.jsx)("p", { children: t("experts.newRevision", { revision: latest.revision }) }), (0, import_jsx_runtime7.jsx)("button", { type: "button", className: TeamExperts_default.button, disabled: busy, onClick: () => {
    change(fromProfile(latest));
  }, children: t("experts.reloadSelected") })] }), catalog?.models.failures.map((failure) => (0, import_jsx_runtime7.jsxs)("p", { className: TeamExperts_default.error, children: [failure.name, ": ", failure.message] }, failure.id)), (0, import_jsx_runtime7.jsxs)("fieldset", { className: TeamExperts_default.fields, disabled: busy, children: [(0, import_jsx_runtime7.jsxs)("label", { children: [t("experts.name"), (0, import_jsx_runtime7.jsx)("input", { value: profile.name, onChange: (event) => {
    update({ ...profile, name: event.target.value });
  } })] }), (0, import_jsx_runtime7.jsxs)("label", { children: [t("roles.description"), (0, import_jsx_runtime7.jsx)("input", { maxLength: 200, value: profile.description, onChange: (event) => {
    update({ ...profile, description: event.target.value });
  } })] }), (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.models, children: [(0, import_jsx_runtime7.jsxs)("label", { children: [t("roles.provider"), (0, import_jsx_runtime7.jsxs)("select", { value: profile.modelProvider ?? "", onChange: (event) => {
    const group = catalog?.models.groups.find((value) => value.id === event.target.value);
    const { modelProvider: _provider, model: _model, reasoningEffort: _effort, ...definition } = profile;
    update({ ...definition, ...group?.models[0] === void 0 ? {} : { modelProvider: group.id, model: group.models[0].id } });
  }, children: [(0, import_jsx_runtime7.jsx)("option", { value: "", children: t("roles.inherit") }), profile.modelProvider !== void 0 && provider === void 0 && (0, import_jsx_runtime7.jsx)("option", { value: profile.modelProvider, children: profile.modelProvider }), catalog?.models.groups.map((group) => (0, import_jsx_runtime7.jsx)("option", { value: group.id, disabled: group.models.length === 0, children: group.name }, group.id))] })] }), (0, import_jsx_runtime7.jsxs)("label", { children: [t("model"), (0, import_jsx_runtime7.jsxs)("select", { value: profile.model ?? "", disabled: provider === void 0, onChange: (event) => {
    const { reasoningEffort: _effort, ...definition } = profile;
    update({ ...definition, model: event.target.value });
  }, children: [profile.model === void 0 ? (0, import_jsx_runtime7.jsx)("option", { value: "", children: t("roles.inherit") }) : model === void 0 && (0, import_jsx_runtime7.jsx)("option", { value: profile.model, children: profile.model }), provider?.models.map((value) => (0, import_jsx_runtime7.jsx)("option", { value: value.id, children: value.name }, value.id))] })] }), (0, import_jsx_runtime7.jsxs)("label", { children: [t("reasoningEffort"), (0, import_jsx_runtime7.jsxs)("select", { value: profile.reasoningEffort ?? "", onChange: (event) => {
    const { reasoningEffort: _effort, ...definition } = profile;
    update(event.target.value === "" ? definition : { ...definition, reasoningEffort: event.target.value });
  }, children: [(0, import_jsx_runtime7.jsx)("option", { value: "", children: t("roles.defaultEffort") }), profile.reasoningEffort !== void 0 && !model?.reasoning?.efforts.some((effort) => effort.id === profile.reasoningEffort) && (0, import_jsx_runtime7.jsx)("option", { value: profile.reasoningEffort, children: profile.reasoningEffort }), model?.reasoning?.efforts.map((effort) => (0, import_jsx_runtime7.jsx)("option", { value: effort.id, children: effort.name }, effort.id))] })] })] }), (0, import_jsx_runtime7.jsx)("p", { className: TeamExperts_default.hint, children: t("experts.modelHint") }), (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.field, children: [(0, import_jsx_runtime7.jsx)("label", { htmlFor: `${formId}-persona`, children: t("roles.persona") }), (0, import_jsx_runtime7.jsx)("textarea", { id: `${formId}-persona`, rows: 4, value: profile.persona, onChange: (event) => {
    update({ ...profile, persona: event.target.value });
  } })] }), (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.field, children: [(0, import_jsx_runtime7.jsx)("label", { htmlFor: `${formId}-instructions`, children: t("roles.instructions") }), (0, import_jsx_runtime7.jsx)("textarea", { id: `${formId}-instructions`, rows: 7, className: TeamExperts_default.instructions, value: profile.instructions, onChange: (event) => {
    update({ ...profile, instructions: event.target.value });
  } })] }), (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.field, children: [(0, import_jsx_runtime7.jsx)("label", { htmlFor: `${formId}-skills`, children: t("experts.skills") }), (0, import_jsx_runtime7.jsx)("textarea", { id: `${formId}-skills`, rows: 3, value: draft.skillsText, onChange: (event) => {
    change({ ...draft, skillsText: event.target.value });
  } })] }), (0, import_jsx_runtime7.jsx)("p", { className: TeamExperts_default.hint, children: t("experts.skillsHint") }), (0, import_jsx_runtime7.jsxs)("label", { className: TeamExperts_default.checkbox, children: [(0, import_jsx_runtime7.jsx)("input", { type: "checkbox", disabled: draft.base === null, checked: draft.archived, onChange: (event) => {
    change({ ...draft, archived: event.target.checked });
  } }), t("experts.archive")] })] }), (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.footer, children: [(0, import_jsx_runtime7.jsx)("span", { role: "status", className: TeamExperts_default.hint, children: t(isEdited(draft) ? "experts.unsaved" : "experts.saved") }), (0, import_jsx_runtime7.jsx)("button", { type: "button", className: TeamExperts_default.primaryButton, disabled: busy || !isEdited(draft), onClick: () => {
    void save();
  }, children: t(saving ? "roles.saving" : "experts.save") })] }), (0, import_jsx_runtime7.jsxs)("section", { className: TeamExperts_default.bindings, children: [(0, import_jsx_runtime7.jsx)("h3", { children: t("experts.bindings") }), (0, import_jsx_runtime7.jsx)("p", { className: TeamExperts_default.hint, children: t("experts.bindingHint") }), bindings.map(({ member, revision }) => (0, import_jsx_runtime7.jsxs)("div", { className: TeamExperts_default.binding, children: [(0, import_jsx_runtime7.jsxs)("span", { children: [member.name, " \xB7 ", t("experts.revision", { revision })] }), (0, import_jsx_runtime7.jsx)("button", { type: "button", className: TeamExperts_default.textButton, disabled: member.phase !== "active", onClick: () => {
    openMember(member.id);
  }, children: t("open") })] }, member.id)), bindings.length === 0 && (0, import_jsx_runtime7.jsx)("p", { className: TeamExperts_default.hint, children: t("experts.unassigned") })] })] }) : (0, import_jsx_runtime7.jsx)("p", { className: TeamExperts_default.hint, children: t("experts.select") })] })] });
}

// packages/team/modules/ui/lib/types/client/TeamGoals.js
var import_jsx_runtime8 = require("react/jsx-runtime");
var import_react5 = require("react");
var import_client3 = require("@deepseek-ai/dsh-api-gateway/client");

// packages/team/modules/ui/lib/types/client/TeamGoals.module.css
var TeamGoals_default = {
  page: "TeamGoals_page",
  header: "TeamGoals_header",
  hint: "TeamGoals_hint",
  status: "TeamGoals_status",
  definition: "TeamGoals_definition",
  pending: "TeamGoals_pending",
  editor: "TeamGoals_editor",
  notice: "TeamGoals_notice",
  actions: "TeamGoals_actions",
  fields: "TeamGoals_fields",
  field: "TeamGoals_field",
  button: "TeamGoals_button",
  textButton: "TeamGoals_textButton",
  error: "TeamGoals_error"
};

// packages/team/modules/ui/lib/types/client/TeamGoals.js
var listFields = ["acceptanceCriteria", "targets", "allowedActions", "excludedTargets", "constraints"];
var resourceFields = ["readPaths", "writePaths", "webOrigins"];
function draftFrom(state) {
  const proposal = state.goalProposal?.change;
  const definition = proposal?.kind === "replace" ? proposal.definition : state.goal?.definition;
  return {
    goalRevision: state.goal?.revision ?? 0,
    proposalRevision: state.goalProposal?.revision ?? 0,
    objective: definition?.objective ?? "",
    coverage: definition?.scope.coverage ?? "task",
    plan: definition?.plan ?? "",
    acceptanceCriteria: definition?.acceptanceCriteria.join("\n") ?? "",
    targets: definition?.scope.targets.join("\n") ?? "",
    allowedActions: definition?.scope.allowedActions.join("\n") ?? "",
    excludedTargets: definition?.scope.excludedTargets.join("\n") ?? "",
    constraints: definition?.scope.constraints.join("\n") ?? "",
    readPaths: definition?.scope.execution?.readPaths.join("\n") ?? ".",
    writePaths: definition?.scope.execution?.writePaths.join("\n") ?? "",
    webOrigins: definition?.scope.execution?.webOrigins.join("\n") ?? "",
    allowSearch: definition?.scope.execution?.allowSearch ?? true,
    allowUnrestrictedExecution: definition?.scope.execution?.allowUnrestrictedExecution ?? false
  };
}
function lines(text2) {
  return text2.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}
function Definition({ definition, t }) {
  const execution = definition.scope.execution;
  return (0, import_jsx_runtime8.jsxs)("dl", { className: TeamGoals_default.definition, children: [(0, import_jsx_runtime8.jsxs)("div", { children: [(0, import_jsx_runtime8.jsx)("dt", { children: t("goals.objective") }), (0, import_jsx_runtime8.jsx)("dd", { children: definition.objective })] }), definition.plan !== void 0 && (0, import_jsx_runtime8.jsxs)("div", { children: [(0, import_jsx_runtime8.jsx)("dt", { children: t("goals.plan") }), (0, import_jsx_runtime8.jsx)("dd", { children: (0, import_jsx_runtime8.jsx)(ProjectPlanView, { text: definition.plan, t }) })] }), (0, import_jsx_runtime8.jsxs)("div", { children: [(0, import_jsx_runtime8.jsx)("dt", { children: t("goals.coverage") }), (0, import_jsx_runtime8.jsx)("dd", { children: t(`goals.coverage.${definition.scope.coverage}`) })] }), listFields.map((field) => {
    const values = field === "acceptanceCriteria" ? definition.acceptanceCriteria : definition.scope[field];
    return (0, import_jsx_runtime8.jsxs)("div", { children: [(0, import_jsx_runtime8.jsx)("dt", { children: t(`goals.${field}`) }), (0, import_jsx_runtime8.jsx)("dd", { children: values.length === 0 ? t("memory.none") : (0, import_jsx_runtime8.jsx)("ul", { children: values.map((value, index) => (0, import_jsx_runtime8.jsx)("li", { children: value }, index)) }) })] }, field);
  }), execution !== void 0 && (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [resourceFields.map((field) => (0, import_jsx_runtime8.jsxs)("div", { children: [(0, import_jsx_runtime8.jsx)("dt", { children: t(`goals.${field}`) }), (0, import_jsx_runtime8.jsx)("dd", { children: execution[field].join("\n") || t("memory.none") })] }, field)), (0, import_jsx_runtime8.jsxs)("div", { children: [(0, import_jsx_runtime8.jsx)("dt", { children: t("goals.allowSearch") }), (0, import_jsx_runtime8.jsx)("dd", { children: t(execution.allowSearch ? "goals.enabled" : "goals.disabled") })] }), (0, import_jsx_runtime8.jsxs)("div", { children: [(0, import_jsx_runtime8.jsx)("dt", { children: t("goals.allowUnrestrictedExecution") }), (0, import_jsx_runtime8.jsx)("dd", { children: t(execution.allowUnrestrictedExecution ? "goals.enabled" : "goals.disabled") })] })] })] });
}
function TeamGoals({ sessionId, state, operations, openReview, t }) {
  const [draft, setDraft] = (0, import_react5.useState)(null);
  const [revoking, setRevoking] = (0, import_react5.useState)(false);
  const [reason, setReason] = (0, import_react5.useState)("");
  const [busy, setBusy] = (0, import_react5.useState)(null);
  const [error, setError] = (0, import_react5.useState)(null);
  const lifetime = (0, import_react5.useRef)(new AbortController());
  const id = (0, import_react5.useId)();
  const goalRevision = state.goal?.revision ?? 0;
  const proposalRevision = state.goalProposal?.revision ?? 0;
  const pending = state.goalProposal !== void 0 && state.goalDecision?.proposalRevision !== proposalRevision;
  const stale = draft !== null && (draft.goalRevision !== goalRevision || draft.proposalRevision !== proposalRevision);
  (0, import_react5.useEffect)(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => {
      controller.abort();
    };
  }, []);
  const report = (failure) => {
    if (!(0, import_client3.isRemoteFailure)(failure))
      throw failure;
    setError(t(failure.code === "TEAM_GOAL_STALE" ? "goals.conflict" : failure.code === "TEAM_GOAL_REVIEW_PENDING" ? "goals.alreadyReviewing" : failure.code === "TEAM_GOAL_NO_REVIEWER" ? "goals.noReviewer" : failure.code === "TEAM_GOAL_INVALID" ? "goals.invalid" : failure.code === "TEAM_GOAL_TOO_LARGE" ? "goals.tooLarge" : "goals.failed"));
  };
  const review = async (revision) => {
    const signal = lifetime.current.signal;
    setBusy("reviewing");
    setError(null);
    openReview();
    try {
      await operations.review(sessionId, revision);
    } catch (failure) {
      if (!signal.aborted)
        report(failure);
    } finally {
      if (!signal.aborted)
        setBusy(null);
    }
  };
  const save = async (change) => {
    if (draft === null)
      return;
    const signal = lifetime.current.signal;
    setBusy("saving");
    setError(null);
    try {
      const proposal = await operations.propose(sessionId, {
        expectedGoalRevision: draft.goalRevision,
        expectedProposalRevision: draft.proposalRevision,
        change
      }, signal);
      if (signal.aborted)
        return;
      setDraft(null);
      setRevoking(false);
      setReason("");
      await review(proposal.revision);
    } catch (failure) {
      if (!signal.aborted) {
        report(failure);
        setBusy(null);
      }
    }
  };
  const replace = () => {
    if (draft === null)
      return;
    const definition = {
      objective: draft.objective.trim(),
      acceptanceCriteria: lines(draft.acceptanceCriteria),
      plan: draft.plan.trim(),
      scope: {
        coverage: draft.coverage,
        targets: lines(draft.targets),
        allowedActions: lines(draft.allowedActions),
        excludedTargets: lines(draft.excludedTargets),
        constraints: lines(draft.constraints),
        execution: {
          readPaths: lines(draft.readPaths),
          writePaths: lines(draft.writePaths),
          webOrigins: lines(draft.webOrigins),
          allowSearch: draft.allowSearch,
          allowUnrestrictedExecution: draft.allowUnrestrictedExecution
        }
      }
    };
    if (!definition.objective || !definition.plan || definition.acceptanceCriteria.length === 0 || definition.scope.targets.length === 0 || definition.scope.allowedActions.length === 0) {
      setError(t("goals.invalid"));
      return;
    }
    void save({ kind: "replace", definition });
  };
  return (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.page, "data-team-goals": true, children: [(0, import_jsx_runtime8.jsxs)("header", { className: TeamGoals_default.header, children: [(0, import_jsx_runtime8.jsxs)("div", { children: [(0, import_jsx_runtime8.jsx)("h2", { children: t("view.goals") }), (0, import_jsx_runtime8.jsx)("p", { className: TeamGoals_default.hint, children: t("goals.hint") })] }), (0, import_jsx_runtime8.jsx)("span", { className: TeamGoals_default.status, children: state.goal === void 0 ? t("goals.unconfirmed") : t(state.goal.status === "active" ? "goals.active" : "goals.revoked", { revision: state.goal.revision }) })] }), state.goal !== void 0 && (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [state.goal.status === "revoked" && (0, import_jsx_runtime8.jsxs)("p", { role: "status", className: TeamGoals_default.notice, children: [t("goals.revokedHint"), " ", state.goal.revocationReason] }), (0, import_jsx_runtime8.jsx)(Definition, { definition: state.goal.definition, t })] }), state.goal === void 0 && (0, import_jsx_runtime8.jsx)("p", { className: TeamGoals_default.hint, children: t("goals.empty") }), pending && (0, import_jsx_runtime8.jsxs)("section", { className: TeamGoals_default.pending, children: [(0, import_jsx_runtime8.jsx)("h3", { children: t("goals.pending", { revision: proposalRevision }) }), state.goalProposal.change.kind === "replace" ? (0, import_jsx_runtime8.jsxs)("details", { open: true, children: [(0, import_jsx_runtime8.jsx)("summary", { children: t("goals.proposalDetails") }), (0, import_jsx_runtime8.jsx)(Definition, { definition: state.goalProposal.change.definition, t })] }) : (0, import_jsx_runtime8.jsxs)("p", { children: [t("goals.revocation"), ": ", state.goalProposal.change.reason] }), (0, import_jsx_runtime8.jsx)("button", { type: "button", className: TeamGoals_default.button, disabled: busy !== null, onClick: () => {
    void review(proposalRevision);
  }, children: t("goals.review") })] }), !pending && state.goalDecision?.outcome === "rejected" && (0, import_jsx_runtime8.jsxs)("p", { role: "status", className: TeamGoals_default.notice, children: [t("goals.rejected"), " ", state.goalDecision.comment] }), error !== null && (0, import_jsx_runtime8.jsx)("p", { role: "alert", className: TeamGoals_default.error, children: error }), busy === "reviewing" && (0, import_jsx_runtime8.jsx)("p", { role: "status", className: TeamGoals_default.notice, children: t("goals.reviewing") }), draft === null ? (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.actions, children: [(0, import_jsx_runtime8.jsx)("button", { type: "button", className: TeamGoals_default.button, disabled: busy !== null, onClick: () => {
    setDraft(draftFrom(state));
    setRevoking(false);
    setError(null);
  }, children: t(state.goal === void 0 ? "goals.create" : state.goal.status === "revoked" ? "goals.restore" : "goals.edit") }), state.goal?.status === "active" && (0, import_jsx_runtime8.jsx)("button", { type: "button", className: TeamGoals_default.textButton, disabled: busy !== null, onClick: () => {
    setDraft(draftFrom(state));
    setRevoking(true);
    setReason("");
    setError(null);
  }, children: t("goals.revoke") })] }) : (0, import_jsx_runtime8.jsxs)("form", { className: TeamGoals_default.editor, onSubmit: (event) => {
    event.preventDefault();
    if (busy !== null || stale)
      return;
    if (!revoking)
      replace();
    else if (reason.trim())
      void save({ kind: "revoke", reason: reason.trim() });
    else
      setError(t("goals.reasonRequired"));
  }, children: [(0, import_jsx_runtime8.jsx)("h3", { children: t(revoking ? "goals.revocation" : "goals.editing") }), stale && (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.notice, children: [(0, import_jsx_runtime8.jsx)("p", { children: t("goals.conflict") }), (0, import_jsx_runtime8.jsx)("button", { type: "button", className: TeamGoals_default.button, disabled: busy !== null, onClick: () => {
    setDraft({ ...draft, goalRevision, proposalRevision });
    setError(null);
  }, children: t("goals.keepDraft") })] }), (0, import_jsx_runtime8.jsx)("fieldset", { className: TeamGoals_default.fields, disabled: busy !== null, children: revoking ? (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.field, children: [(0, import_jsx_runtime8.jsx)("label", { htmlFor: `${id}-reason`, children: t("goals.reason") }), (0, import_jsx_runtime8.jsx)("textarea", { id: `${id}-reason`, rows: 3, value: reason, onChange: (event) => {
    setReason(event.target.value);
  } })] }) : (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [(0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.field, children: [(0, import_jsx_runtime8.jsx)("label", { htmlFor: `${id}-objective`, children: t("goals.objective") }), (0, import_jsx_runtime8.jsx)("textarea", { id: `${id}-objective`, rows: 3, value: draft.objective, onChange: (event) => {
    setDraft({ ...draft, objective: event.target.value });
  } })] }), (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.field, children: [(0, import_jsx_runtime8.jsx)("label", { htmlFor: `${id}-plan`, children: t("goals.plan") }), (0, import_jsx_runtime8.jsx)("textarea", { id: `${id}-plan`, rows: 9, value: draft.plan, onChange: (event) => {
    setDraft({ ...draft, plan: event.target.value });
  } }), (0, import_jsx_runtime8.jsx)("small", { className: TeamGoals_default.hint, children: t("goals.planHint") })] }), (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.field, children: [(0, import_jsx_runtime8.jsx)("label", { htmlFor: `${id}-coverage`, children: t("goals.coverage") }), (0, import_jsx_runtime8.jsx)("select", { id: `${id}-coverage`, value: draft.coverage, onChange: (event) => {
    const value = event.target.value;
    if (value === "task" || value === "partial" || value === "full")
      setDraft({ ...draft, coverage: value });
  }, children: ["task", "partial", "full"].map((value) => (0, import_jsx_runtime8.jsx)("option", { value, children: t(`goals.coverage.${value}`) }, value)) }), (0, import_jsx_runtime8.jsx)("small", { className: TeamGoals_default.hint, children: t("goals.coverageHint") })] }), (0, import_jsx_runtime8.jsx)("p", { className: TeamGoals_default.hint, children: t("goals.linesHint") }), listFields.map((field) => (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.field, children: [(0, import_jsx_runtime8.jsx)("label", { htmlFor: `${id}-${field}`, children: t(`goals.${field}`) }), (0, import_jsx_runtime8.jsx)("textarea", { id: `${id}-${field}`, rows: 3, value: draft[field], onChange: (event) => {
    setDraft({ ...draft, [field]: event.target.value });
  } })] }, field)), (0, import_jsx_runtime8.jsxs)("details", { children: [(0, import_jsx_runtime8.jsx)("summary", { children: t("goals.executionScope") }), (0, import_jsx_runtime8.jsx)("p", { className: TeamGoals_default.hint, children: t("goals.executionHint") }), resourceFields.map((field) => (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.field, children: [(0, import_jsx_runtime8.jsx)("label", { htmlFor: `${id}-${field}`, children: t(`goals.${field}`) }), (0, import_jsx_runtime8.jsx)("textarea", { id: `${id}-${field}`, rows: 2, value: draft[field], onChange: (event) => {
    setDraft({ ...draft, [field]: event.target.value });
  } })] }, field)), ["allowSearch", "allowUnrestrictedExecution"].map((field) => (0, import_jsx_runtime8.jsx)("div", { className: TeamGoals_default.field, children: (0, import_jsx_runtime8.jsxs)("label", { children: [(0, import_jsx_runtime8.jsx)("input", { type: "checkbox", checked: draft[field], onChange: (event) => {
    setDraft({ ...draft, [field]: event.target.checked });
  } }), " ", t(`goals.${field}`)] }) }, field))] })] }) }), (0, import_jsx_runtime8.jsxs)("div", { className: TeamGoals_default.actions, children: [(0, import_jsx_runtime8.jsx)("button", { type: "submit", className: TeamGoals_default.button, disabled: busy !== null || stale, children: t(busy === "saving" ? "goals.saving" : "goals.saveAndReview") }), (0, import_jsx_runtime8.jsx)("button", { type: "button", className: TeamGoals_default.textButton, disabled: busy !== null, onClick: () => {
    setDraft(null);
    setRevoking(false);
    setError(null);
  }, children: t("goals.cancelEdit") })] })] })] });
}

// packages/team/modules/ui/lib/types/client/TeamMailbox.js
var import_jsx_runtime9 = require("react/jsx-runtime");
var import_react6 = require("react");

// packages/team/modules/ui/lib/types/client/TeamMailbox.module.css
var TeamMailbox_default = {
  page: "TeamMailbox_page",
  heading: "TeamMailbox_heading",
  row: "TeamMailbox_row",
  pagination: "TeamMailbox_pagination",
  message: "TeamMailbox_message",
  list: "TeamMailbox_list",
  item: "TeamMailbox_item",
  body: "TeamMailbox_body",
  detail: "TeamMailbox_detail",
  error: "TeamMailbox_error"
};

// packages/team/modules/ui/lib/types/client/TeamMailbox.js
var PAGE_SIZE = 20;
function TeamMailbox({ sessionId, leadId, members, operations, t }) {
  const [offset, setOffset] = (0, import_react6.useState)(0);
  const [refresh, setRefresh] = (0, import_react6.useState)(0);
  const [page, setPage] = (0, import_react6.useState)(null);
  const [selectedId, setSelectedId] = (0, import_react6.useState)(null);
  const [detail, setDetail] = (0, import_react6.useState)(null);
  const [busy, setBusy] = (0, import_react6.useState)(null);
  const [error, setError] = (0, import_react6.useState)(null);
  const [notice, setNotice] = (0, import_react6.useState)(null);
  const lifetime = (0, import_react6.useRef)(new AbortController());
  const isLead = sessionId === leadId;
  (0, import_react6.useEffect)(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => {
      controller.abort();
    };
  }, []);
  (0, import_react6.useEffect)(() => {
    let current = true;
    setPage(null);
    void operations.list(sessionId, offset, PAGE_SIZE).then((value) => {
      if (current) {
        setPage(value);
        setError(null);
      }
    }, () => {
      if (current)
        setError(t("mailbox.loadFailed"));
    });
    return () => {
      current = false;
    };
  }, [sessionId, offset, refresh, operations, t]);
  (0, import_react6.useEffect)(() => {
    let current = true;
    setDetail(null);
    if (selectedId !== null)
      void operations.get(sessionId, selectedId).then((value) => {
        if (current) {
          setDetail(value);
          setError(null);
        }
      }, () => {
        if (current)
          setError(t("mailbox.detailFailed"));
      });
    return () => {
      current = false;
    };
  }, [sessionId, selectedId, operations, t]);
  const run = async (kind, message) => {
    setBusy(message.id);
    setError(null);
    setNotice(null);
    try {
      const result = await operations[kind](sessionId, message.id, lifetime.current.signal);
      if (lifetime.current.signal.aborted)
        return;
      setNotice(t(result.status === "accepted" ? "mailbox.accepted" : "mailbox.queued"));
      setOffset(0);
      setRefresh((value) => value + 1);
    } catch {
      if (!lifetime.current.signal.aborted)
        setError(t("mailbox.actionFailed"));
    } finally {
      if (!lifetime.current.signal.aborted)
        setBusy(null);
    }
  };
  const targetName = (id) => members.find((member) => member.id === id)?.name ?? String(id);
  return (0, import_jsx_runtime9.jsxs)("div", { className: TeamMailbox_default.page, children: [(0, import_jsx_runtime9.jsxs)("div", { className: TeamMailbox_default.heading, children: [(0, import_jsx_runtime9.jsx)("p", { children: t("mailbox.hint") }), (0, import_jsx_runtime9.jsx)("button", { type: "button", onClick: () => {
    setRefresh((value) => value + 1);
  }, children: t("mailbox.refresh") })] }), error !== null && (0, import_jsx_runtime9.jsx)("p", { role: "alert", className: TeamMailbox_default.error, children: error }), notice !== null && (0, import_jsx_runtime9.jsx)("p", { role: "status", children: notice }), page === null ? (0, import_jsx_runtime9.jsx)("p", { role: "status", children: t("mailbox.loading") }) : (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [page.total === 0 ? (0, import_jsx_runtime9.jsx)("p", { children: t("mailbox.empty") }) : (0, import_jsx_runtime9.jsx)("ul", { className: TeamMailbox_default.list, children: page.items.map((message) => (0, import_jsx_runtime9.jsxs)("li", { className: TeamMailbox_default.item, children: [(0, import_jsx_runtime9.jsxs)("div", { className: TeamMailbox_default.row, children: [(0, import_jsx_runtime9.jsxs)("button", { type: "button", className: TeamMailbox_default.message, onClick: () => {
    setSelectedId(selectedId === message.id ? null : message.id);
  }, "aria-expanded": selectedId === message.id, children: [(0, import_jsx_runtime9.jsxs)("strong", { children: [message.senderName, " \u2192 ", targetName(message.targetId)] }), (0, import_jsx_runtime9.jsxs)("span", { children: [t(`mailbox.status.${message.status}`), " \xB7 ", message.goalRevision === void 0 ? t("mailbox.unversioned") : t("mailbox.goalRevision", { revision: message.goalRevision })] })] }), (message.status === "pending" || message.status === "retry-exhausted") && (0, import_jsx_runtime9.jsx)("button", { type: "button", disabled: busy !== null, onClick: () => {
    void run("retry", message);
  }, children: t("mailbox.retry") }), message.status === "quarantined" && isLead && (0, import_jsx_runtime9.jsx)("button", { type: "button", disabled: busy !== null, onClick: () => {
    void run("adopt", message);
  }, children: t("mailbox.adopt") })] }), message.error !== void 0 && (0, import_jsx_runtime9.jsx)("p", { className: TeamMailbox_default.error, children: message.error }), message.status === "retry-exhausted" && (0, import_jsx_runtime9.jsx)("p", { children: t("mailbox.exhausted", { attempts: message.attempts }) }), selectedId === message.id && (0, import_jsx_runtime9.jsx)("div", { className: TeamMailbox_default.detail, children: detail?.id !== message.id ? (0, import_jsx_runtime9.jsx)("p", { role: "status", children: t("mailbox.loadingDetail") }) : (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [(0, import_jsx_runtime9.jsxs)("p", { children: [t("mailbox.id"), ": ", detail.id] }), detail.adoptedFrom !== void 0 && (0, import_jsx_runtime9.jsxs)("p", { children: [t("mailbox.adoptedFrom"), ": ", detail.adoptedFrom] }), detail.content.map((block, index) => block.type === "text" ? (0, import_jsx_runtime9.jsx)("p", { className: TeamMailbox_default.body, children: block.text }, index) : (0, import_jsx_runtime9.jsx)("p", { children: t("mailbox.nonText") }, index))] }) })] }, message.id)) }), (0, import_jsx_runtime9.jsxs)("nav", { className: TeamMailbox_default.pagination, "aria-label": t("mailbox.pagination"), children: [(0, import_jsx_runtime9.jsx)("button", { type: "button", disabled: offset === 0, onClick: () => {
    setOffset(Math.max(0, offset - PAGE_SIZE));
    setSelectedId(null);
  }, children: t("mailbox.previous") }), (0, import_jsx_runtime9.jsx)("span", { children: t("mailbox.range", { start: page.total === 0 ? 0 : offset + 1, end: offset + page.items.length, total: page.total }) }), (0, import_jsx_runtime9.jsx)("button", { type: "button", disabled: offset + page.items.length >= page.total, onClick: () => {
    setOffset(offset + PAGE_SIZE);
    setSelectedId(null);
  }, children: t("mailbox.next") })] })] })] });
}

// packages/team/modules/ui/lib/types/client/MemberSkills.js
var import_jsx_runtime10 = require("react/jsx-runtime");

// packages/team/modules/ui/lib/types/client/MemberSkills.module.css
var MemberSkills_default = {
  skills: "MemberSkills_skills",
  hint: "MemberSkills_hint",
  choices: "MemberSkills_choices",
  versions: "MemberSkills_versions"
};

// packages/team/modules/ui/lib/types/client/MemberSkills.js
function MemberSkills({ selection, t }) {
  const skills = selection?.skills ?? [];
  return (0, import_jsx_runtime10.jsxs)("section", { className: MemberSkills_default.skills, "aria-label": t("skills.title"), children: [(0, import_jsx_runtime10.jsx)("h3", { children: t("skills.title") }), skills.length === 0 ? (0, import_jsx_runtime10.jsx)("p", { className: MemberSkills_default.hint, children: t("skills.empty") }) : (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [(0, import_jsx_runtime10.jsx)("p", { className: MemberSkills_default.hint, role: "status", children: t(selection?.active === true ? "skills.restore" : "skills.stale") }), (0, import_jsx_runtime10.jsx)("ul", { className: MemberSkills_default.choices, children: skills.map((skill) => (0, import_jsx_runtime10.jsxs)("li", { children: [(0, import_jsx_runtime10.jsx)("p", { children: skill.purpose }), (0, import_jsx_runtime10.jsx)("span", { children: skill.name })] }, skill.name)) })] }), selection !== void 0 && (0, import_jsx_runtime10.jsxs)("details", { className: MemberSkills_default.versions, children: [(0, import_jsx_runtime10.jsx)("summary", { children: t("skills.versions") }), (0, import_jsx_runtime10.jsx)("p", { children: t("skills.revision", { revision: selection.revision }) }), (0, import_jsx_runtime10.jsx)("p", { children: selection.goalRevision === 0 ? t("skills.unconfirmedGoal") : t("skills.goalRevision", { revision: selection.goalRevision }) }), (0, import_jsx_runtime10.jsx)("ul", { children: skills.map((skill) => (0, import_jsx_runtime10.jsxs)("li", { children: [(0, import_jsx_runtime10.jsxs)("span", { children: [skill.name, " \xB7 ", t("skills.bytes", { bytes: skill.bytes })] }), (0, import_jsx_runtime10.jsx)("code", { children: skill.digest })] }, skill.name)) })] })] });
}

// packages/team/modules/ui/lib/types/client/TeamMemberControls.js
var import_jsx_runtime11 = require("react/jsx-runtime");
var import_react7 = require("react");
function TeamMemberControls({ sessionId, member, inactive, operations, t }) {
  const [workspace, setWorkspace] = (0, import_react7.useState)(void 0);
  const [catalog, setCatalog] = (0, import_react7.useState)(null);
  const [modelProvider, setModelProvider] = (0, import_react7.useState)(member.modelProvider ?? "");
  const [model, setModel] = (0, import_react7.useState)(member.model ?? "");
  const [reasoningEffort, setReasoningEffort] = (0, import_react7.useState)(member.reasoningEffort ?? "");
  const [teamFunction, setTeamFunction] = (0, import_react7.useState)(member.teamFunction ?? "");
  const [roleReason, setRoleReason] = (0, import_react7.useState)("");
  const [modelError, setModelError] = (0, import_react7.useState)(false);
  const [modelRead, setModelRead] = (0, import_react7.useState)(0);
  const [busy, setBusy] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)(null);
  const [notice, setNotice] = (0, import_react7.useState)(null);
  const controller = (0, import_react7.useRef)(new AbortController());
  const inFlight = (0, import_react7.useRef)(false);
  const modelDraft = (0, import_react7.useRef)(false);
  const modelBaseRevision = (0, import_react7.useRef)(member.modelRouteRevision ?? 0);
  (0, import_react7.useEffect)(() => {
    const lifetime = new AbortController();
    controller.current = lifetime;
    modelDraft.current = false;
    modelBaseRevision.current = member.modelRouteRevision ?? 0;
    setWorkspace(void 0);
    setError(null);
    setNotice(null);
    setBusy(false);
    inFlight.current = false;
    void operations.workspace(sessionId, member.name).then((value) => {
      if (!lifetime.signal.aborted)
        setWorkspace(value);
    }, () => {
      if (!lifetime.signal.aborted)
        setError(t("member.workspaceFailed"));
    });
    return () => {
      lifetime.abort();
    };
  }, [sessionId, member.id, member.name, operations, t]);
  (0, import_react7.useEffect)(() => {
    let current = true;
    setCatalog(null);
    setModelError(false);
    if (!modelDraft.current) {
      modelBaseRevision.current = member.modelRouteRevision ?? 0;
      setModelProvider(member.modelProvider ?? "");
      setModel(member.model ?? "");
      setReasoningEffort(member.reasoningEffort ?? "");
    }
    void operations.models().then((value) => {
      if (!current)
        return;
      setCatalog(value);
      if (modelDraft.current)
        return;
      if (member.modelProvider !== void 0) {
        setModelProvider(member.modelProvider);
        setModel(member.model ?? "");
        setReasoningEffort(member.reasoningEffort ?? "");
        return;
      }
      const group = value.groups.find((candidate) => candidate.id === value.default.provider) ?? value.groups[0];
      const currentModel = group?.models.find((candidate) => candidate.id === member.model);
      const selected = currentModel ?? group?.models.find((candidate) => candidate.id === value.default.model) ?? group?.models[0];
      setModelProvider(group?.id ?? "");
      setModel(selected?.id ?? "");
      setReasoningEffort(currentModel?.reasoning?.efforts.some((effort) => effort.id === member.reasoningEffort) ? member.reasoningEffort ?? "" : "");
    }, () => {
      if (current)
        setModelError(true);
    });
    return () => {
      current = false;
    };
  }, [sessionId, member.id, member.modelProvider, member.model, member.reasoningEffort, member.modelRouteRevision, modelRead, operations]);
  (0, import_react7.useEffect)(() => {
    setTeamFunction(member.teamFunction ?? "");
    setRoleReason("");
  }, [member.id, member.teamFunction, member.roleRevision]);
  const functions = ["planning_adviser", "quality_adviser", "domain_adviser", "group_lead", "executor", "verifier"];
  const run = async (action) => {
    if (inFlight.current)
      return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const signal = controller.current.signal;
    try {
      if (action === "configureRole") {
        if (teamFunction === "")
          return;
        await operations.configureRole(sessionId, {
          target: member.name,
          expectedRevision: member.roleRevision ?? 0,
          teamFunction,
          reason: roleReason
        }, signal);
        if (!signal.aborted)
          setNotice(t("member.roleSaved"));
      } else if (action === "configure") {
        const saved = await operations.configureModel(sessionId, {
          target: member.name,
          expectedRevision: modelBaseRevision.current,
          modelProvider,
          model,
          ...reasoningEffort === "" ? {} : { reasoningEffort }
        }, signal);
        if (!signal.aborted) {
          modelDraft.current = false;
          modelBaseRevision.current = saved.modelRouteRevision ?? member.modelRouteRevision ?? 0;
          setNotice(t("member.modelSaved"));
        }
      } else if (action === "integrate") {
        const result = await operations.integrate(sessionId, member.name, signal);
        if (!signal.aborted)
          setNotice(result.paths.length === 0 ? t("member.integratedEmpty") : t("member.integratedPaths", { paths: result.paths.join(", ") }));
      } else {
        await operations[action](sessionId, member.name, signal);
        if (!signal.aborted)
          setNotice(t(action === "retire" ? "member.retired" : "member.reactivated"));
      }
    } catch (cause) {
      const detail = typeof cause === "object" && cause !== null && "message" in cause && typeof cause.message === "string" ? cause.message.trim() : "";
      if (!signal.aborted)
        setError(detail === "" ? t("member.actionFailed") : `${t("member.actionFailed")} ${detail}`);
    } finally {
      if (!signal.aborted) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  const provider = catalog?.groups.find((group) => group.id === modelProvider);
  const selectedModel = provider?.models.find((candidate) => candidate.id === model);
  return (0, import_jsx_runtime11.jsxs)("section", { className: TeamView_default.memberActions, "aria-label": t("member.actions"), children: [(0, import_jsx_runtime11.jsx)("h3", { children: t("member.actions") }), (0, import_jsx_runtime11.jsxs)("div", { className: TeamView_default.memberModelForm, children: [(0, import_jsx_runtime11.jsx)("h4", { children: t("member.modelTitle") }), (0, import_jsx_runtime11.jsx)("p", { className: TeamView_default.hint, children: t("member.modelHint") }), catalog === null ? (0, import_jsx_runtime11.jsxs)("div", { role: "status", children: [t(modelError ? "member.modelCatalogFailed" : "loading"), modelError && (0, import_jsx_runtime11.jsx)("button", { type: "button", className: TeamView_default.button, onClick: () => {
    setModelRead((value) => value + 1);
  }, children: t("member.retryModels") })] }) : (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [(0, import_jsx_runtime11.jsxs)("label", { children: [t("roles.provider"), (0, import_jsx_runtime11.jsxs)("select", { value: modelProvider, onChange: (event) => {
    modelDraft.current = true;
    const next = catalog.groups.find((group) => group.id === event.target.value);
    setModelProvider(event.target.value);
    setModel(next?.models[0]?.id ?? "");
    setReasoningEffort("");
  }, children: [provider === void 0 && modelProvider !== "" && (0, import_jsx_runtime11.jsx)("option", { value: modelProvider, disabled: true, children: t("member.unlistedRoute", { name: modelProvider }) }), catalog.groups.map((group) => (0, import_jsx_runtime11.jsx)("option", { value: group.id, children: group.name }, group.id))] })] }), (0, import_jsx_runtime11.jsxs)("label", { children: [t("model"), (0, import_jsx_runtime11.jsxs)("select", { value: model, onChange: (event) => {
    modelDraft.current = true;
    setModel(event.target.value);
    setReasoningEffort("");
  }, children: [selectedModel === void 0 && model !== "" && (0, import_jsx_runtime11.jsx)("option", { value: model, disabled: true, children: t("member.unlistedRoute", { name: model }) }), provider?.models.map((candidate) => (0, import_jsx_runtime11.jsx)("option", { value: candidate.id, children: candidate.name }, candidate.id))] })] }), (0, import_jsx_runtime11.jsxs)("label", { children: [t("reasoningEffort"), (0, import_jsx_runtime11.jsxs)("select", { value: reasoningEffort, onChange: (event) => {
    modelDraft.current = true;
    setReasoningEffort(event.target.value);
  }, children: [(0, import_jsx_runtime11.jsx)("option", { value: "", children: t("member.highestEffort") }), reasoningEffort !== "" && !selectedModel?.reasoning?.efforts.some((effort) => effort.id === reasoningEffort) && (0, import_jsx_runtime11.jsx)("option", { value: reasoningEffort, disabled: true, children: reasoningEffort }), selectedModel?.reasoning?.efforts.map((effort) => (0, import_jsx_runtime11.jsx)("option", { value: effort.id, children: effort.name }, effort.id))] })] }), (0, import_jsx_runtime11.jsx)("button", { type: "button", className: TeamView_default.button, disabled: busy || model === "" || selectedModel === void 0, onClick: () => {
    void run("configure");
  }, children: t("member.saveModel") })] })] }), (0, import_jsx_runtime11.jsxs)("div", { className: TeamView_default.memberModelForm, children: [(0, import_jsx_runtime11.jsx)("h4", { children: t("member.roleTitle") }), (0, import_jsx_runtime11.jsx)("p", { className: TeamView_default.hint, children: t("member.roleHint") }), (0, import_jsx_runtime11.jsxs)("label", { children: [t("member.roleTitle"), (0, import_jsx_runtime11.jsxs)("select", { value: teamFunction, disabled: busy || !inactive, onChange: (event) => {
    const selected = functions.find((value) => value === event.target.value);
    setTeamFunction(selected ?? "");
  }, children: [(0, import_jsx_runtime11.jsx)("option", { value: "", children: t("member.roleUnset") }), functions.map((value) => (0, import_jsx_runtime11.jsx)("option", { value, children: t(memberFunctionKey({ ...member, teamFunction: value })) }, value))] })] }), (0, import_jsx_runtime11.jsxs)("label", { children: [t("member.roleReason"), (0, import_jsx_runtime11.jsx)("input", { value: roleReason, onChange: (event) => {
    setRoleReason(event.target.value);
  } })] }), (0, import_jsx_runtime11.jsx)("button", { type: "button", className: TeamView_default.button, disabled: busy || !inactive || teamFunction === "" || roleReason.trim() === "", onClick: () => {
    void run("configureRole");
  }, children: t("member.saveRole") })] }), member.phase === "active" && (0, import_jsx_runtime11.jsx)("button", { type: "button", className: TeamView_default.button, disabled: busy || !inactive, onClick: () => {
    void run("retire");
  }, children: t("member.retire") }), member.phase === "retired" && (0, import_jsx_runtime11.jsx)("button", { type: "button", className: TeamView_default.button, disabled: busy, onClick: () => {
    void run("reactivate");
  }, children: t("member.reactivate") }), (0, import_jsx_runtime11.jsx)("p", { className: TeamView_default.hint, children: member.phase === "retired" ? t("member.retiredHint") : t("member.retireHint") }), workspace === void 0 ? (0, import_jsx_runtime11.jsx)("p", { role: "status", children: t("member.workspaceLoading") }) : workspace === null ? (0, import_jsx_runtime11.jsx)("p", { children: t("member.sharedWorkspace") }) : (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [(0, import_jsx_runtime11.jsx)("p", { children: t("member.privateWorkspace") }), (0, import_jsx_runtime11.jsx)("p", { className: TeamView_default.preservedText, children: workspace.cwd }), member.phase === "active" && (0, import_jsx_runtime11.jsx)("button", { type: "button", className: TeamView_default.button, disabled: busy || !inactive, onClick: () => {
    void run("integrate");
  }, children: t("member.integrate") }), (0, import_jsx_runtime11.jsx)("p", { className: TeamView_default.hint, children: t("member.integrateHint") })] }), error !== null && (0, import_jsx_runtime11.jsx)("p", { role: "alert", className: TeamView_default.error, children: error }), notice !== null && (0, import_jsx_runtime11.jsx)("p", { role: "status", children: notice })] });
}

// packages/team/modules/ui/lib/types/client/TeamTaskArchive.js
var import_jsx_runtime12 = require("react/jsx-runtime");
var import_react8 = require("react");
var PAGE_SIZE2 = 20;
function TeamTaskArchive({ sessionId, operations, t }) {
  const [page, setPage] = (0, import_react8.useState)(null);
  const [pageIndex, setPageIndex] = (0, import_react8.useState)(0);
  const [cursors, setCursors] = (0, import_react8.useState)([void 0]);
  const [opened, setOpened] = (0, import_react8.useState)(false);
  const [loading, setLoading] = (0, import_react8.useState)(false);
  const [busy, setBusy] = (0, import_react8.useState)(null);
  const [checks, setChecks] = (0, import_react8.useState)({});
  const [error, setError] = (0, import_react8.useState)(null);
  const [failedPage, setFailedPage] = (0, import_react8.useState)(null);
  const lifetime = (0, import_react8.useRef)(new AbortController());
  const inFlight = (0, import_react8.useRef)(false);
  const validating = (0, import_react8.useRef)(false);
  (0, import_react8.useEffect)(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    setPage(null);
    setPageIndex(0);
    setCursors([void 0]);
    setOpened(false);
    setLoading(false);
    setBusy(null);
    setChecks({});
    setError(null);
    setFailedPage(null);
    inFlight.current = false;
    validating.current = false;
    return () => {
      controller.abort();
    };
  }, [sessionId]);
  const load = async (after, index) => {
    if (inFlight.current)
      return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    setFailedPage(null);
    const signal = lifetime.current.signal;
    try {
      const loaded = await operations.archive(sessionId, after, PAGE_SIZE2);
      if (!signal.aborted) {
        setPage(loaded);
        setPageIndex(index);
        setCursors((current) => [...current.slice(0, index), after]);
        setChecks({});
      }
    } catch {
      if (!signal.aborted) {
        setError(t("archive.loadFailed"));
        setFailedPage({ after, index });
      }
    } finally {
      if (!signal.aborted) {
        inFlight.current = false;
        setLoading(false);
      }
    }
  };
  const validate = async (task) => {
    if (validating.current)
      return;
    validating.current = true;
    setBusy(task.id);
    setError(null);
    const signal = lifetime.current.signal;
    try {
      const check = await operations.validateReuse(sessionId, task.id, signal);
      if (!signal.aborted)
        setChecks((current) => ({ ...current, [task.id]: check }));
    } catch {
      if (!signal.aborted)
        setError(t("archive.validateFailed"));
    } finally {
      if (!signal.aborted) {
        validating.current = false;
        setBusy(null);
      }
    }
  };
  const tasks = page?.tasks ?? [];
  const next = page?.nextCursor;
  return (0, import_jsx_runtime12.jsxs)("section", { className: TeamView_default.archive, children: [(0, import_jsx_runtime12.jsx)("button", { type: "button", className: TeamView_default.button, "aria-expanded": opened, onClick: () => {
    setOpened((value) => !value);
    if (!opened && page === null)
      void load(void 0, 0);
  }, children: t("archive.title") }), opened && (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [(0, import_jsx_runtime12.jsx)("p", { className: TeamView_default.hint, children: t("archive.hint") }), page !== null && (0, import_jsx_runtime12.jsx)("button", { type: "button", className: TeamView_default.button, disabled: loading, onClick: () => {
    void load(void 0, 0);
  }, children: t("archive.refresh") }), error !== null && (0, import_jsx_runtime12.jsx)("p", { role: "alert", className: TeamView_default.error, children: error }), loading && (0, import_jsx_runtime12.jsx)("p", { role: "status", children: t("archive.loading") }), !loading && page !== null && tasks.length === 0 && (0, import_jsx_runtime12.jsx)("p", { children: t("archive.empty") }), tasks.map((task) => {
    const check = checks[task.id];
    const changed = check !== void 0 && check.revision !== task.revision;
    return (0, import_jsx_runtime12.jsxs)("details", { className: TeamView_default.task, children: [(0, import_jsx_runtime12.jsxs)("summary", { children: [(0, import_jsx_runtime12.jsx)("strong", { children: task.subject }), (0, import_jsx_runtime12.jsx)("span", { children: task.ownerName ?? t("unowned") }), (0, import_jsx_runtime12.jsx)("span", { children: t(taskWorkStateKey(task) ?? "status.completed") })] }), (0, import_jsx_runtime12.jsxs)("div", { className: TeamView_default.taskBody, children: [(0, import_jsx_runtime12.jsx)("p", { children: task.description }), task.result !== void 0 && (0, import_jsx_runtime12.jsxs)("section", { children: [(0, import_jsx_runtime12.jsx)("h4", { children: t("task.recordedResult") }), (0, import_jsx_runtime12.jsx)("p", { children: task.result })] }), task.evidence !== void 0 && task.evidence.length > 0 && (0, import_jsx_runtime12.jsxs)("section", { children: [(0, import_jsx_runtime12.jsx)("h4", { children: t("task.evidence") }), (0, import_jsx_runtime12.jsx)("ul", { children: task.evidence.map((entry, index) => (0, import_jsx_runtime12.jsx)("li", { children: entry }, index)) })] }), (0, import_jsx_runtime12.jsx)(TaskWorkDetails, { task, t }), (0, import_jsx_runtime12.jsx)("button", { type: "button", className: TeamView_default.button, disabled: busy !== null, onClick: () => {
      void validate(task);
    }, children: t("archive.validate") }), check === void 0 ? (0, import_jsx_runtime12.jsx)("p", { className: TeamView_default.hint, children: t("archive.unchecked") }) : (0, import_jsx_runtime12.jsxs)("div", { role: "status", children: [(0, import_jsx_runtime12.jsx)("strong", { children: t(!changed && check.validity.reusable ? "archive.reusable" : "archive.stale") }), changed && (0, import_jsx_runtime12.jsx)("p", { children: t("archive.changed") }), check.validity.reasons.length > 0 && (0, import_jsx_runtime12.jsx)("ul", { children: check.validity.reasons.map((reason) => (0, import_jsx_runtime12.jsx)("li", { children: reason }, reason)) })] })] })] }, task.id);
  }), pageIndex > 0 && (0, import_jsx_runtime12.jsx)("button", { type: "button", className: TeamView_default.button, disabled: loading, onClick: () => {
    void load(cursors[pageIndex - 1], pageIndex - 1);
  }, children: t("archive.previous") }), next !== void 0 && (0, import_jsx_runtime12.jsx)("button", { type: "button", className: TeamView_default.button, disabled: loading, onClick: () => {
    void load(next, pageIndex + 1);
  }, children: t("archive.more") }), failedPage !== null && (0, import_jsx_runtime12.jsx)("button", { type: "button", className: TeamView_default.button, onClick: () => {
    void load(failedPage.after, failedPage.index);
  }, children: t("archive.retry") })] })] });
}

// packages/team/modules/ui/lib/types/client/TeamDiagnostics.js
var import_jsx_runtime13 = require("react/jsx-runtime");
var import_react9 = require("react");
function diagnosticSnapshot(team, now) {
  return {
    format: "dsh-team-diagnostics",
    version: 1,
    exportedAt: now,
    goal: { revision: team.goal?.revision ?? 0, status: team.goal?.status ?? "unconfirmed" },
    members: team.members.map((member) => ({
      id: member.id,
      parentId: member.parentId,
      role: member.role,
      function: member.teamFunction,
      phase: member.phase,
      legacy: member.legacyMode !== void 0,
      selectedSkills: team.skillSelections?.find((selection) => selection.memberId === member.id)?.skills.length ?? 0
    })),
    tasks: team.tasks.map((task) => ({
      id: task.id,
      revision: task.revision,
      status: task.status,
      executionId: task.work?.execution?.id,
      phase: task.work?.execution?.phase,
      goalRevision: task.work?.plan.goalRevision,
      dependencies: task.blockedBy,
      blocker: task.dispatchBlocker,
      reusable: task.validity.reusable,
      requiredCriteria: task.work?.plan.acceptanceCriteria.length ?? 0
    })),
    completed: team.completedTaskCount ?? 0,
    evidence: { adviserDecisions: team.adviserDecisions?.length ?? 0 },
    limits: { externalConfinementVerified: false, toolHealthVerified: false, providerCostKnown: false }
  };
}
function TeamDiagnostics({ team, t }) {
  const [error, setError] = (0, import_react9.useState)(null);
  let plan;
  try {
    plan = readProjectPlan(team.goal?.definition.plan);
  } catch (failure) {
    if (!(failure instanceof Error))
      throw failure;
    plan = void 0;
  }
  const needsReview = team.tasks.filter((task) => task.work?.execution?.phase === "submitted").length;
  const resourceWaits = team.tasks.filter((task) => task.status === "pending" && task.writeScopeWarnings.some((warning) => warning.startsWith("exclusive resource is owned by task "))).length;
  return (0, import_jsx_runtime13.jsxs)("section", { className: TeamView_default.memory, children: [(0, import_jsx_runtime13.jsx)("h2", { children: t("diagnostics.title") }), (0, import_jsx_runtime13.jsx)("p", { className: TeamView_default.hint, children: t("diagnostics.hint") }), (0, import_jsx_runtime13.jsxs)("dl", { className: TeamView_default.diagnosticGrid, children: [(0, import_jsx_runtime13.jsx)("dt", { children: t("diagnostics.goal") }), (0, import_jsx_runtime13.jsx)("dd", { children: team.goal?.revision ?? 0 }), (0, import_jsx_runtime13.jsx)("dt", { children: t("diagnostics.provision") }), (0, import_jsx_runtime13.jsx)("dd", { children: t(plan?.automation?.provision === "on-demand" ? "plan.onDemand" : "plan.manual") }), (0, import_jsx_runtime13.jsx)("dt", { children: t("plan.members") }), (0, import_jsx_runtime13.jsx)("dd", { children: plan?.resources.maxMembers ?? t("diagnostics.unknown") }), (0, import_jsx_runtime13.jsx)("dt", { children: t("plan.requests") }), (0, import_jsx_runtime13.jsx)("dd", { children: plan?.resources.maxConcurrentRequests ?? t("diagnostics.unknown") }), (0, import_jsx_runtime13.jsx)("dt", { children: t("diagnostics.review") }), (0, import_jsx_runtime13.jsx)("dd", { children: needsReview }), (0, import_jsx_runtime13.jsx)("dt", { children: t("work.resourceBusy") }), (0, import_jsx_runtime13.jsx)("dd", { children: resourceWaits }), (0, import_jsx_runtime13.jsx)("dt", { children: t("diagnostics.failed") }), (0, import_jsx_runtime13.jsx)("dd", { children: team.members.filter((member) => member.phase === "failed").length })] }), (0, import_jsx_runtime13.jsx)("p", { children: t("diagnostics.health") }), (0, import_jsx_runtime13.jsx)("p", { children: t("diagnostics.cost") }), (0, import_jsx_runtime13.jsx)("p", { children: t("view.isolationHint") }), (0, import_jsx_runtime13.jsx)("button", { type: "button", className: TeamView_default.button, onClick: () => {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(diagnosticSnapshot(team, Date.now()), null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "team-workbench-diagnostics.json";
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
      setError(null);
    } catch (failure) {
      setError(String(failure));
    }
  }, children: t("diagnostics.export") }), error !== null && (0, import_jsx_runtime13.jsx)("p", { role: "alert", className: TeamView_default.error, children: error })] });
}

// packages/team/modules/ui/lib/types/client/TeamView.js
function TeamSummary({ members, useSessions, useSessionStatus, t }) {
  const runtime = useSessionStatus((state) => members.map((member) => state.get(member.id)?.pendingInteraction !== void 0 ? "input" : state.get(member.id)?.running === true ? "running" : state.get(member.id)?.running === false ? "idle" : "unknown").join(","));
  const summaries = useSessions((state) => members.map((member) => state.byId[member.id]?.running === true ? "running" : state.byId[member.id]?.running === false ? "idle" : "unknown").join(","));
  const actual = runtime.split(",");
  const fallback = summaries.split(",");
  let running = 0, waiting = 0, idle = 0, preparing = 0, failed = 0, unknown = 0;
  members.forEach((member, index) => {
    if (member.phase === "failed")
      failed++;
    else if (member.phase === "provisioning")
      preparing++;
    else if (member.phase !== "retired") {
      const status = actual[index] === "unknown" ? fallback[index] : actual[index];
      if (status === "input")
        waiting++;
      else if (status === "running")
        running++;
      else if (status === "unknown")
        unknown++;
      else
        idle++;
    }
  });
  return (0, import_jsx_runtime14.jsxs)("section", { className: TeamView_default.summary, "aria-label": t("view.summary"), children: [(0, import_jsx_runtime14.jsxs)("span", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: members.filter((member) => member.legacyMode === void 0).length }), t("view.teamCount")] }), (0, import_jsx_runtime14.jsxs)("span", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: running }), t("memberStatus.running")] }), (0, import_jsx_runtime14.jsxs)("span", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: idle }), t("memberStatus.inactive")] }), unknown > 0 && (0, import_jsx_runtime14.jsxs)("span", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: unknown }), t("memberStatus.unknown")] }), waiting > 0 && (0, import_jsx_runtime14.jsxs)("span", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: waiting }), t("memberStatus.needsInput")] }), preparing > 0 && (0, import_jsx_runtime14.jsxs)("span", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: preparing }), t("memberStatus.provisioning")] }), failed > 0 && (0, import_jsx_runtime14.jsxs)("span", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: failed }), t("memberStatus.failed")] }), members.some((member) => member.legacyMode !== void 0) && (0, import_jsx_runtime14.jsxs)("span", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: members.filter((member) => member.legacyMode !== void 0).length }), t("view.legacyCount")] })] });
}
function MemberRow({ member, depth, selected, select, useSessions, useSessionStatus, t }) {
  const selection = useSessions((state) => state.projectionsBySession[member.id]?.values.modelSelection);
  const model = memberModelDisplay(member, selection);
  const running = useSessionStatus((state) => state.get(member.id)?.running);
  const pendingInteraction = useSessionStatus((state) => state.get(member.id)?.pendingInteraction);
  const summaryRunning = useSessions((state) => state.byId[member.id]?.running);
  const status = memberActivity(member, running, summaryRunning, pendingInteraction !== void 0);
  return (0, import_jsx_runtime14.jsx)("li", { className: selected ? `${TeamView_default.memberItem} ${TeamView_default.selectedRow}` : TeamView_default.memberItem, style: { marginInlineStart: `${Math.min(Math.max(depth - 1, 0), 4) * 12}px` }, children: (0, import_jsx_runtime14.jsxs)("button", { type: "button", className: TeamView_default.memberButton, onClick: select, "aria-expanded": selected, "aria-label": member.expert?.name ?? member.name, children: [(0, import_jsx_runtime14.jsx)(import_dsh_client_ui_primitives2.IconUserOutlineRegular, { size: 17 }), (0, import_jsx_runtime14.jsxs)("span", { className: TeamView_default.memberIdentity, children: [(0, import_jsx_runtime14.jsx)("strong", { children: member.expert?.name ?? member.name }), (0, import_jsx_runtime14.jsxs)("span", { className: TeamView_default.memberBadges, children: [(0, import_jsx_runtime14.jsx)("small", { children: t(member.role === "lead" ? "view.communicator" : memberFunctionKey(member)) }), member.role !== "lead" && member.legacyMode === void 0 && (0, import_jsx_runtime14.jsx)("small", { children: t(member.expert === void 0 ? "view.retained" : "view.expert") })] }), member.role !== "lead" && member.legacyMode === void 0 && (0, import_jsx_runtime14.jsx)("small", { className: TeamView_default.roleSummary, children: member.description }), (0, import_jsx_runtime14.jsxs)("small", { className: TeamView_default.model, children: [(0, import_jsx_runtime14.jsx)("span", { children: model.model ?? t("view.sessionModel") }), " \xB7 ", (0, import_jsx_runtime14.jsx)("span", { children: model.reasoningEffort ?? t("roles.defaultEffort") })] }), model.next !== void 0 && (0, import_jsx_runtime14.jsxs)("small", { className: TeamView_default.modelNote, children: [(0, import_jsx_runtime14.jsx)("span", { children: t("view.nextModel", { model: model.next.model }) }), " \xB7 ", (0, import_jsx_runtime14.jsx)("span", { children: t("view.nextEffort", { effort: model.next.reasoningEffort ?? t("roles.defaultEffort") }) })] }), depth > 1 && (0, import_jsx_runtime14.jsx)("small", { className: TeamView_default.modelNote, children: t("view.descendant") }), member.legacyMode !== void 0 && (0, import_jsx_runtime14.jsx)("small", { className: TeamView_default.modelNote, children: t(`view.legacy.${member.legacyMode}`) })] }), (0, import_jsx_runtime14.jsxs)("span", { className: TeamView_default.memberStatus, children: [(0, import_jsx_runtime14.jsx)(import_dsh_client_ui_primitives2.StateDot, { state: status === "failed" ? "error" : status === "inactive" || status === "retired" || status === "unknown" ? "idle" : status === "needsInput" ? "warning" : "ongoing" }), (0, import_jsx_runtime14.jsx)("span", { children: t(`memberStatus.${status}`) })] })] }) });
}
function TaskRow({ task, ownerRunning, currentGoalRevision, duplicate, t }) {
  return (0, import_jsx_runtime14.jsxs)("details", { className: TeamView_default.task, children: [(0, import_jsx_runtime14.jsxs)("summary", { children: [(0, import_jsx_runtime14.jsx)("strong", { children: task.subject }), (0, import_jsx_runtime14.jsxs)("span", { children: [task.ownerName ?? t("unowned"), " \xB7 ", task.id] }), (0, import_jsx_runtime14.jsx)("span", { children: t(taskWorkStateKey(task, ownerRunning, currentGoalRevision) ?? `status.${task.status === "deleted" ? "completed" : task.status}`) })] }), (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.taskBody, children: [duplicate && (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.hint, children: t("work.duplicateSubject") }), (0, import_jsx_runtime14.jsx)("p", { children: task.description }), task.blockedBy.length > 0 && (0, import_jsx_runtime14.jsxs)("p", { children: [t("blockedBy"), ": ", task.blockedBy.join(", ")] }), task.writeScopes.length > 0 && (0, import_jsx_runtime14.jsxs)("p", { children: [t("writeScopes"), ": ", task.writeScopes.join(", ")] }), task.result !== void 0 && (0, import_jsx_runtime14.jsxs)("section", { children: [(0, import_jsx_runtime14.jsx)("h4", { children: t(task.validity.reusable ? "task.result" : "task.recordedResult") }), (0, import_jsx_runtime14.jsx)("p", { children: task.result })] }), task.evidence !== void 0 && task.evidence.length > 0 && (0, import_jsx_runtime14.jsxs)("section", { children: [(0, import_jsx_runtime14.jsx)("h4", { children: t("task.evidence") }), (0, import_jsx_runtime14.jsx)("ul", { children: task.evidence.map((entry, index) => (0, import_jsx_runtime14.jsx)("li", { children: entry }, index)) })] }), (0, import_jsx_runtime14.jsx)(TaskWorkDetails, { task, t }), task.writeScopeWarnings.map((warning) => (0, import_jsx_runtime14.jsx)("p", { role: "status", children: warning }, warning))] })] });
}
function TeamView({ sessionId, useSession, useSessions, useSessionStatus, openTeammate, refreshTeam, roles: roles2, experts, goals, mailbox, members, taskArchive, openView, t, useRecoveredTeam = () => void 0 }) {
  const [tab, setTab] = (0, import_react10.useState)("members");
  const [expertsVisited, setExpertsVisited] = (0, import_react10.useState)(false);
  const [goalsVisited, setGoalsVisited] = (0, import_react10.useState)(false);
  const [search, setSearch] = (0, import_react10.useState)("");
  const [taskQuery, setTaskQuery] = (0, import_react10.useState)("");
  const [taskFilter, setTaskFilter] = (0, import_react10.useState)("all");
  const [visibleLimit, setVisibleLimit] = (0, import_react10.useState)(50);
  const [compact, setCompact] = (0, import_react10.useState)(false);
  const [selectedId, setSelectedId] = (0, import_react10.useState)(null);
  const [selectedTaskId, setSelectedTaskId] = (0, import_react10.useState)(null);
  const [error, setError] = (0, import_react10.useState)(null);
  const detailsRef = (0, import_react10.useRef)(null);
  const tabId = (0, import_react10.useId)();
  const parentId = useSession((snapshot) => snapshot.subagent?.address.parentSessionId);
  const opening = useSession((snapshot) => snapshot.openState === "loading");
  const listing = useSessions((state) => state.phase === "pending");
  const recoveredTeam = useRecoveredTeam(sessionId);
  const team = useSessions((state) => selectTeam(state, sessionId, parentId)) ?? recoveredTeam;
  const pendingGoalReview = useSessionStatus((state) => state.get(team?.members.find((member) => member.role === "lead")?.id ?? sessionId)?.pendingInteraction?.kind === "plan-review");
  const taskActivities = useTaskActivities(team, useSessions, useSessionStatus);
  const duplicateSubjects = duplicateTaskSubjects(team?.tasks ?? []);
  const recovery = useTeamProjectionRecovery(sessionId, true, team === void 0, refreshTeam);
  (0, import_react10.useEffect)(() => {
    if (pendingGoalReview)
      openView("chat", "");
  }, [pendingGoalReview, openView]);
  const rows = (0, import_react10.useMemo)(() => teamHierarchy(team?.members ?? []), [team?.members]);
  const workGroups = (0, import_react10.useMemo)(() => teamWorkGroups(team?.members ?? [], team?.tasks ?? []), [team?.members, team?.tasks]);
  const visibleTasks = (0, import_react10.useMemo)(() => (team?.tasks ?? []).filter((task) => (taskFilter === "all" || task.status === taskFilter) && [task.id, task.subject, task.description, task.ownerName, ...task.writeScopes].some((value) => value?.toLocaleLowerCase().includes(taskQuery.trim().toLocaleLowerCase()))), [team?.tasks, taskFilter, taskQuery]);
  const displayedTaskIds = new Set(visibleTasks.slice(0, visibleLimit).map((task) => task.id));
  const visibleWorkGroups = workGroups.map((group) => ({ ...group, tasks: group.tasks.filter((task) => displayedTaskIds.has(task.id)) })).filter((group) => group.tasks.length > 0);
  const tasksByOwner = (0, import_react10.useMemo)(() => {
    const result = /* @__PURE__ */ new Map();
    for (const task of team?.tasks ?? []) {
      if (task.ownerName === void 0)
        continue;
      const owned = result.get(task.ownerName) ?? [];
      owned.push(task);
      result.set(task.ownerName, owned);
    }
    return result;
  }, [team?.tasks]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchingRows = useSessions((state) => rows.map(({ member }) => {
    if (normalizedSearch === "")
      return "1";
    const model = memberModelDisplay(member, state.projectionsBySession[member.id]?.values.modelSelection);
    return [
      member.name,
      member.expert?.name,
      member.description,
      model.model,
      model.reasoningEffort,
      model.next?.model,
      model.next?.reasoningEffort
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch)) ? "1" : "0";
  }).join(""));
  const filtered = rows.filter((_, index) => matchingRows[index] === "1");
  const selected = team?.members.find((member) => member.id === selectedId) ?? team?.members.find((member) => member.role === "lead");
  const selectedTask = team?.tasks.find((task) => task.id === selectedTaskId);
  const selectedModelSelection = useSessions((state) => selected === void 0 ? void 0 : state.projectionsBySession[selected.id]?.values.modelSelection);
  const selectedModel = selected === void 0 ? void 0 : memberModelDisplay(selected, selectedModelSelection);
  const selectedRunning = useSessionStatus((state) => selected === void 0 ? void 0 : state.get(selected.id)?.running);
  const selectedSummaryRunning = useSessions((state) => selected === void 0 ? void 0 : state.byId[selected.id]?.running);
  const tabIds = [
    "members",
    "tasks",
    ...goals === void 0 ? [] : ["goals"],
    "memory",
    ...mailbox === void 0 ? [] : ["mailbox"],
    ...experts === void 0 ? [] : ["experts"],
    "diagnostics"
  ];
  (0, import_react10.useEffect)(() => {
    setSearch("");
    setTaskQuery("");
    setTaskFilter("all");
    setVisibleLimit(50);
    setSelectedId(null);
    setSelectedTaskId(null);
    setError(null);
    setTab("members");
    setExpertsVisited(false);
    setGoalsVisited(false);
  }, [sessionId]);
  (0, import_react10.useEffect)(() => {
    if (selectedId === null && selectedTaskId === null)
      return;
    const details = detailsRef.current;
    if (details !== null && details.parentElement !== null && details.getBoundingClientRect().top > details.parentElement.getBoundingClientRect().top + 4) {
      details.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId, selectedTaskId]);
  const selectTab = (value) => {
    setTab(value);
    if (value === "experts")
      setExpertsVisited(true);
    if (value === "goals")
      setGoalsVisited(true);
  };
  return (0, import_jsx_runtime14.jsxs)("div", { className: compact ? `${TeamView_default.page} ${TeamView_default.compact}` : TeamView_default.page, "data-team-view": true, "data-conversation-composer-overlay": true, children: [(0, import_jsx_runtime14.jsxs)("header", { className: TeamView_default.header, children: [(0, import_jsx_runtime14.jsxs)("div", { children: [(0, import_jsx_runtime14.jsx)("h1", { children: t("view.title") }), (0, import_jsx_runtime14.jsx)("p", { children: t("view.subtitle") })] }), (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.headerActions, children: [goals !== void 0 && (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.button, onClick: () => {
    selectTab("goals");
  }, children: t("view.fullPlan") }), (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.button, onClick: () => {
    setCompact(!compact);
  }, children: t(compact ? "view.comfortable" : "view.compact") }), roles2 !== void 0 && (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.button, onClick: () => {
    setTab(tab === "settings" ? "members" : "settings");
  }, children: t(tab === "settings" ? "view.backToMembers" : "view.settings") })] })] }), team !== void 0 && (0, import_jsx_runtime14.jsx)(TeamSummary, { members: team.members, useSessions, useSessionStatus, t }), (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.goal, children: [(0, import_jsx_runtime14.jsx)("span", { children: t(team?.goal?.status === "revoked" ? "goals.revokedShort" : "view.goal") }), (0, import_jsx_runtime14.jsx)("p", { children: team?.goal?.definition.objective ?? t("goals.empty") }), goals !== void 0 && (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.textButton, onClick: () => {
    selectTab("goals");
  }, children: t("view.scope") })] }), error !== null && (0, import_jsx_runtime14.jsx)("p", { role: "alert", className: TeamView_default.error, children: error }), team?.failure !== void 0 && (0, import_jsx_runtime14.jsx)("p", { role: "alert", className: TeamView_default.error, children: t("failure", { message: team.failure }) }), tab === "settings" && roles2 !== void 0 ? (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.settings, children: [(0, import_jsx_runtime14.jsx)(CurrentTeamRoles, { members: team?.members ?? [], plannedTeam: team?.goalProposal?.change.kind === "replace" && team.goalDecision?.proposalRevision !== team.goalProposal.revision ? team.goalProposal.change.definition.plan : void 0, useSessions, t }), (0, import_jsx_runtime14.jsx)(TeamRoles, { operations: roles2, t })] }) : (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [(0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.toolbar, children: [(0, import_jsx_runtime14.jsx)("div", { role: "tablist", "aria-label": t("workspace.navigation"), className: TeamView_default.tabs, children: tabIds.map((value, index) => (0, import_jsx_runtime14.jsx)("button", { type: "button", id: `${tabId}-${value}`, role: "tab", "aria-selected": tab === value, "aria-controls": `${tabId}-panel`, tabIndex: tab === value ? 0 : -1, onClick: () => {
    selectTab(value);
  }, onKeyDown: (event) => {
    const next = event.key === "ArrowRight" ? (index + 1) % tabIds.length : event.key === "ArrowLeft" ? (index + tabIds.length - 1) % tabIds.length : event.key === "Home" ? 0 : event.key === "End" ? tabIds.length - 1 : void 0;
    if (next === void 0)
      return;
    event.preventDefault();
    const value2 = tabIds[next];
    if (value2 === void 0)
      return;
    selectTab(value2);
    document.getElementById(`${tabId}-${value2}`)?.focus();
  }, children: t(`view.${value}`) }, value)) }), tab === "members" && (0, import_jsx_runtime14.jsx)("input", { className: TeamView_default.search, type: "search", "aria-label": t("view.search"), placeholder: t("view.search"), value: search, onChange: (event) => {
    setSearch(event.target.value);
  } })] }), (0, import_jsx_runtime14.jsxs)("section", { id: tab === "experts" || tab === "goals" || tab === "mailbox" ? void 0 : `${tabId}-panel`, hidden: tab === "experts" || tab === "goals" || tab === "mailbox", role: "tabpanel", "aria-labelledby": `${tabId}-${tab}`, className: TeamView_default.content, children: [team === void 0 && (0, import_jsx_runtime14.jsxs)("div", { role: "status", className: TeamView_default.empty, children: [t(opening || listing || recovery.state === "loading" ? "loading" : "unavailable"), !opening && !listing && recovery.state !== "loading" && (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.button, onClick: recovery.retry, children: t("recovery.retry") })] }), team !== void 0 && tab === "members" && (0, import_jsx_runtime14.jsx)(import_jsx_runtime14.Fragment, { children: (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.overviewGrid, children: [(0, import_jsx_runtime14.jsxs)("aside", { className: TeamView_default.rosterPane, "aria-label": t("view.memberTree"), children: [(0, import_jsx_runtime14.jsxs)("h2", { children: [t("roster"), " ", (0, import_jsx_runtime14.jsx)("small", { children: team.members.length })] }), (0, import_jsx_runtime14.jsx)("ul", { className: TeamView_default.memberList, "data-team-member-list": true, children: filtered.map(({ member, depth }, index) => (0, import_jsx_runtime14.jsxs)(import_react10.Fragment, { children: [(index === 0 || memberSection(filtered[index - 1].member) !== memberSection(member)) && (0, import_jsx_runtime14.jsx)("li", { role: "presentation", className: TeamView_default.groupLabel, children: t(`view.group.${memberSection(member)}`) }), (0, import_jsx_runtime14.jsx)(MemberRow, { member, depth, selected: selectedId === member.id, select: () => {
    setSelectedId(member.id);
    setSelectedTaskId(null);
  }, useSessions, useSessionStatus, t })] }, member.id)) }), filtered.length === 0 && (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.empty, children: t("view.noMatches") }), (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.hint, children: t("view.memberCount", { visible: filtered.length, total: team.members.length }) })] }), (0, import_jsx_runtime14.jsxs)("section", { className: TeamView_default.boardPane, "aria-label": t("view.groupTasks"), children: [(0, import_jsx_runtime14.jsxs)("header", { children: [(0, import_jsx_runtime14.jsxs)("h2", { children: [t("view.groupTasks"), " ", (0, import_jsx_runtime14.jsx)("small", { children: team.tasks.length })] }), (0, import_jsx_runtime14.jsx)("span", { children: t("view.filteredTasks", { visible: Math.min(visibleTasks.length, visibleLimit), total: team.tasks.length }) })] }), (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.boardFilters, children: [(0, import_jsx_runtime14.jsx)("input", { type: "search", className: TeamView_default.search, "aria-label": t("view.taskSearch"), placeholder: t("view.taskSearch"), value: taskQuery, onChange: (event) => {
    setTaskQuery(event.target.value);
    setVisibleLimit(50);
  } }), (0, import_jsx_runtime14.jsx)("select", { "aria-label": t("view.taskFilter"), className: TeamView_default.filterSelect, value: taskFilter, onChange: (event) => {
    const value = event.target.value;
    if (value === "all" || value === "pending" || value === "in_progress" || value === "completed") {
      setTaskFilter(value);
      setVisibleLimit(50);
    }
  }, children: ["all", "pending", "in_progress", "completed"].map((value) => (0, import_jsx_runtime14.jsx)("option", { value, children: t(`view.filter.${value}`) }, value)) })] }), team.tasks.length === 0 && (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.boardEmpty, children: [(0, import_jsx_runtime14.jsx)("p", { children: t("view.noActiveTasks") }), (0, import_jsx_runtime14.jsx)("small", { children: t("view.completedHint", { count: team.completedTaskCount ?? 0 }) }), taskArchive !== void 0 && (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.button, onClick: () => {
    selectTab("tasks");
  }, children: t("view.openArchive") })] }), (0, import_jsx_runtime14.jsx)("div", { className: TeamView_default.groupBoard, children: visibleWorkGroups.map((group) => (0, import_jsx_runtime14.jsxs)("section", { className: TeamView_default.groupLane, children: [(0, import_jsx_runtime14.jsxs)("header", { children: [(0, import_jsx_runtime14.jsx)("h3", { children: group.leader?.expert?.name ?? group.leader?.name ?? t(group.id === "lead" ? "workspace.leadGroup" : "workspace.unassignedGroup") }), (0, import_jsx_runtime14.jsx)("small", { children: t("workspace.groupProgress", {
    completed: group.tasks.filter((task) => task.status === "completed").length,
    total: group.tasks.length
  }) })] }), (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.groupMembers, children: [group.members.filter((member) => member.role !== "lead").slice(0, 5).map((member) => (0, import_jsx_runtime14.jsx)("button", { type: "button", "aria-label": t("view.inspectGroupMember", { name: member.expert?.name ?? member.name }), onClick: () => {
    setSelectedId(member.id);
    setSelectedTaskId(null);
  }, children: member.expert?.name ?? member.name }, member.id)), group.members.filter((member) => member.role !== "lead").length > 5 && (0, import_jsx_runtime14.jsxs)("span", { children: ["+", group.members.filter((member) => member.role !== "lead").length - 5] })] }), group.tasks.map((task) => (0, import_jsx_runtime14.jsxs)("button", { type: "button", className: selectedTaskId === task.id ? `${TeamView_default.boardTask} ${TeamView_default.boardTaskSelected}` : TeamView_default.boardTask, "aria-pressed": selectedTaskId === task.id, onClick: () => {
    setSelectedTaskId(task.id);
  }, children: [(0, import_jsx_runtime14.jsxs)("small", { children: [task.id, " \xB7 ", t(taskWorkStateKey(task, taskActivities.get(task.id), team.goal?.revision) ?? `status.${task.status === "deleted" ? "completed" : task.status}`)] }), (0, import_jsx_runtime14.jsx)("strong", { children: task.subject }), (0, import_jsx_runtime14.jsx)("span", { children: task.description }), duplicateSubjects.has(task.id) && (0, import_jsx_runtime14.jsx)("small", { children: t("work.duplicateSubject") }), (0, import_jsx_runtime14.jsxs)("small", { children: [task.ownerName ?? t("unowned"), task.blockedBy.length > 0 ? ` \xB7 ${t("blockedBy")}: ${task.blockedBy.join(", ")}` : ""] })] }, task.id))] }, group.id)) }), visibleTasks.length === 0 && team.tasks.length > 0 && (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.empty, children: t("view.noMatches") }), visibleTasks.length > visibleLimit && (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.button, onClick: () => {
    setVisibleLimit(visibleLimit + 50);
  }, children: t("view.showMore") }), (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.hint, children: t("view.isolationHint") })] }), (0, import_jsx_runtime14.jsx)("aside", { ref: detailsRef, className: TeamView_default.inspectorPane, "aria-label": t("workspace.details"), children: selectedTask !== void 0 ? (0, import_jsx_runtime14.jsxs)("section", { "aria-label": t("view.taskDetail"), children: [(0, import_jsx_runtime14.jsxs)("h2", { children: [selectedTask.subject, " \xB7 ", selectedTask.id] }), (0, import_jsx_runtime14.jsx)("p", { children: selectedTask.description }), (0, import_jsx_runtime14.jsxs)("dl", { children: [(0, import_jsx_runtime14.jsx)("dt", { children: t("owner") }), (0, import_jsx_runtime14.jsx)("dd", { children: selectedTask.ownerName ?? t("unowned") }), selectedTask.reviewerName !== void 0 && (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [(0, import_jsx_runtime14.jsx)("dt", { children: t("view.reviewer") }), (0, import_jsx_runtime14.jsx)("dd", { children: selectedTask.reviewerName })] }), selectedTask.autoAssign !== void 0 && (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [(0, import_jsx_runtime14.jsx)("dt", { children: t("view.autoAssign") }), (0, import_jsx_runtime14.jsx)("dd", { children: t(selectedTask.autoAssign ? "view.enabled" : "view.disabled") })] }), selectedTask.requiredSkill !== void 0 && (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [(0, import_jsx_runtime14.jsx)("dt", { children: t("view.requiredSkill") }), (0, import_jsx_runtime14.jsx)("dd", { children: selectedTask.requiredSkill })] }), (0, import_jsx_runtime14.jsx)("dt", { children: t("view.status") }), (0, import_jsx_runtime14.jsx)("dd", { children: t(taskWorkStateKey(selectedTask, taskActivities.get(selectedTask.id), team.goal?.revision) ?? `status.${selectedTask.status === "deleted" ? "completed" : selectedTask.status}`) }), (0, import_jsx_runtime14.jsx)("dt", { children: t("blockedBy") }), (0, import_jsx_runtime14.jsx)("dd", { children: selectedTask.blockedBy.join(", ") || t("memory.none") })] }), (0, import_jsx_runtime14.jsx)(TaskWorkDetails, { task: selectedTask, t }), (0, import_jsx_runtime14.jsx)(AdviserFindings, { task: selectedTask, findings: team.adviserDecisions, t }), selectedTask.evidence !== void 0 && selectedTask.evidence.length > 0 && (0, import_jsx_runtime14.jsxs)("details", { children: [(0, import_jsx_runtime14.jsx)("summary", { children: t("task.evidence") }), (0, import_jsx_runtime14.jsx)("ul", { children: selectedTask.evidence.map((entry, index) => (0, import_jsx_runtime14.jsx)("li", { children: entry }, index)) })] })] }) : selected !== void 0 && (0, import_jsx_runtime14.jsxs)("section", { "aria-label": t("view.memberDetail"), children: [(0, import_jsx_runtime14.jsxs)("header", { children: [(0, import_jsx_runtime14.jsx)("h2", { children: selected.expert?.name ?? selected.name }), (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.button, disabled: selected.phase === "provisioning" || selected.phase === "failed", onClick: () => {
    try {
      if (selected.id === sessionId)
        openView("chat", "");
      else {
        openTeammate(sessionId, selected.id);
        openView("chat", "");
      }
    } catch (reason) {
      setError(String(reason));
    }
  }, children: t("open") })] }), (0, import_jsx_runtime14.jsx)("p", { children: selected.description }), (0, import_jsx_runtime14.jsxs)("dl", { children: [(0, import_jsx_runtime14.jsx)("dt", { children: t("model") }), (0, import_jsx_runtime14.jsx)("dd", { children: selectedModel?.model ?? t("view.sessionModel") }), (0, import_jsx_runtime14.jsx)("dt", { children: t("reasoningEffort") }), (0, import_jsx_runtime14.jsx)("dd", { children: selectedModel?.reasoningEffort ?? t("roles.defaultEffort") }), (0, import_jsx_runtime14.jsx)("dt", { children: t("workspace.modelSource") }), (0, import_jsx_runtime14.jsx)("dd", { children: t(`view.modelSource.${selectedModel?.source ?? "bound"}`) }), (0, import_jsx_runtime14.jsx)("dt", { children: t("parent") }), (0, import_jsx_runtime14.jsx)("dd", { children: team.members.find((member) => member.id === selected.parentId)?.name ?? t("memory.none") }), (0, import_jsx_runtime14.jsx)("dt", { children: t("workspace.groupMembers") }), (0, import_jsx_runtime14.jsx)("dd", { children: team.members.filter((member) => member.parentId === selected.id).length })] }), selected.expert !== void 0 && (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.hint, children: t("view.boundRevision", { revision: selected.expert.revision }) }), selected.persona !== void 0 && (0, import_jsx_runtime14.jsxs)("details", { children: [(0, import_jsx_runtime14.jsx)("summary", { children: t("view.persona") }), (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.preservedText, children: selected.persona })] }), selected.error !== void 0 && (0, import_jsx_runtime14.jsx)("p", { role: "alert", children: selected.error }), selected.legacyMode !== void 0 && (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.hint, children: t(`view.legacy.${selected.legacyMode}`) }), members !== void 0 && selected.role !== "lead" && selected.legacyMode === void 0 && (0, import_jsx_runtime14.jsx)(TeamMemberControls, { sessionId, member: selected, inactive: (selectedRunning ?? selectedSummaryRunning) === false, operations: members, t }, `${sessionId}:${selected.id}`), selected.legacyMode === void 0 && (0, import_jsx_runtime14.jsx)(MemberSkills, { selection: team.skillSelections?.find((selection) => selection.memberId === selected.id), t }, selected.id), (0, import_jsx_runtime14.jsx)("h3", { children: t("view.memberTasks") }), (tasksByOwner.get(selected.name)?.length ?? 0) === 0 ? (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.hint, children: t("view.noTask") }) : tasksByOwner.get(selected.name)?.map((task) => (0, import_jsx_runtime14.jsx)(TaskRow, { task, ownerRunning: taskActivities.get(task.id), currentGoalRevision: team.goal?.revision, duplicate: duplicateSubjects.has(task.id), t }, task.id))] }) })] }) }), team !== void 0 && tab === "tasks" && (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [team.tasks.length === 0 ? (0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.empty, children: t("view.noActiveTasks") }) : team.tasks.map((task) => (0, import_jsx_runtime14.jsx)(TaskRow, { task, ownerRunning: taskActivities.get(task.id), currentGoalRevision: team.goal?.revision, duplicate: duplicateSubjects.has(task.id), t }, task.id)), taskArchive !== void 0 && (0, import_jsx_runtime14.jsx)(TeamTaskArchive, { sessionId, operations: taskArchive, t }, `${sessionId}:${team.goal?.revision ?? 0}:${team.goal?.status ?? "none"}`)] }), team !== void 0 && tab === "diagnostics" && (0, import_jsx_runtime14.jsx)(TeamDiagnostics, { team, t }), team !== void 0 && tab === "memory" && (0, import_jsx_runtime14.jsxs)("div", { className: TeamView_default.memory, children: [(0, import_jsx_runtime14.jsx)("p", { className: TeamView_default.hint, children: t("memory.hint") }), team.brief === void 0 ? (0, import_jsx_runtime14.jsx)("p", { children: t("memory.empty") }) : (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [(team.brief.goalRevision === void 0 || team.brief.goalRevision !== (team.goal?.revision ?? 0) || team.goal?.status === "revoked") && (0, import_jsx_runtime14.jsx)("p", { role: "status", children: t("memory.historical") }), (0, import_jsx_runtime14.jsxs)("section", { children: [(0, import_jsx_runtime14.jsx)("h2", { children: t("memory.objective") }), (0, import_jsx_runtime14.jsx)("p", { children: team.brief.objective })] }), (0, import_jsx_runtime14.jsxs)("section", { children: [(0, import_jsx_runtime14.jsx)("h2", { children: t("memory.authorization") }), (0, import_jsx_runtime14.jsx)("p", { children: team.brief.authorization || t("memory.none") })] }), (0, import_jsx_runtime14.jsxs)("section", { children: [(0, import_jsx_runtime14.jsx)("h2", { children: t("memory.decisions") }), (0, import_jsx_runtime14.jsx)("p", { children: team.brief.decisions || t("memory.none") })] })] })] })] })] }), experts !== void 0 && expertsVisited && (0, import_jsx_runtime14.jsx)("section", { id: tab === "experts" ? `${tabId}-panel` : void 0, role: "tabpanel", "aria-labelledby": `${tabId}-experts`, hidden: tab !== "experts", className: TeamView_default.content, children: (0, import_jsx_runtime14.jsx)(TeamExperts, { operations: experts, members: team?.members ?? [], openMember: (id) => {
    if (id !== sessionId)
      openTeammate(sessionId, id);
    openView("chat", "");
  }, t }, sessionId) }), goals !== void 0 && goalsVisited && (0, import_jsx_runtime14.jsx)("section", { id: tab === "goals" ? `${tabId}-panel` : void 0, role: "tabpanel", "aria-labelledby": `${tabId}-goals`, hidden: tab !== "goals", className: TeamView_default.content, children: team === void 0 ? (0, import_jsx_runtime14.jsxs)("div", { role: "status", className: TeamView_default.empty, children: [t(opening || listing || recovery.state === "loading" ? "loading" : "unavailable"), !opening && !listing && recovery.state !== "loading" && (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.button, onClick: recovery.retry, children: t("recovery.retry") })] }) : (0, import_jsx_runtime14.jsx)(TeamGoals, { sessionId, operations: goals, state: team, openReview: () => {
    openView("chat", "");
  }, t }, sessionId) }), mailbox !== void 0 && tab === "mailbox" && team !== void 0 && (0, import_jsx_runtime14.jsx)("section", { id: `${tabId}-panel`, role: "tabpanel", "aria-labelledby": `${tabId}-mailbox`, className: TeamView_default.content, children: (0, import_jsx_runtime14.jsx)(TeamMailbox, { sessionId, leadId: team.members.find((member) => member.role === "lead")?.id ?? sessionId, members: team.members, operations: mailbox, t }) }), (0, import_jsx_runtime14.jsxs)("footer", { className: TeamView_default.footer, children: [(0, import_jsx_runtime14.jsxs)("span", { children: [t("workspace.completed"), " ", team?.completedTaskCount ?? team?.tasks.filter((task) => task.status === "completed").length ?? 0] }), (0, import_jsx_runtime14.jsx)("button", { type: "button", className: TeamView_default.textButton, onClick: () => {
    openView("chat", "");
  }, children: t("view.chat") })] })] });
}

// packages/team/modules/ui/lib/types/client/projection-recovery-store.js
var import_react11 = require("react");
function createTeamProjectionRecovery(resolve, read) {
  const values = /* @__PURE__ */ new Map();
  const pending = /* @__PURE__ */ new Map();
  const listeners = /* @__PURE__ */ new Set();
  const lifetime = new AbortController();
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    async refresh(id) {
      lifetime.signal.throwIfAborted();
      const root = resolve(id);
      const active = pending.get(root);
      if (active !== void 0)
        return active;
      const operation = read(root, lifetime.signal).then((value) => {
        lifetime.signal.throwIfAborted();
        if (value !== void 0)
          values.set(root, value);
        for (const listener of listeners)
          listener();
      }).finally(() => {
        pending.delete(root);
      });
      pending.set(root, operation);
      return operation;
    },
    useRecoveredTeam(id) {
      return (0, import_react11.useSyncExternalStore)(subscribe, () => values.get(resolve(id)));
    },
    dispose() {
      lifetime.abort();
      values.clear();
      listeners.clear();
    }
  };
}

// packages/team/modules/ui/lib/types/client/mount.js
var inject = ["sessions", "uiWorkspace", "slots", "locale", "remote", "remote.settings", "remote.session", "remote.teamExperts", "remote.agentTeams"];
function registerAgentTeamUi(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "client-ui-agent-team: dictionaries");
  const t = ctx.locale.bind(NS);
  const sessions = ctx.sessions;
  const leadSessionId = (sessionId) => {
    const state = sessions.list.getSnapshot();
    const team = selectTeam(state, sessionId, sessions.subagentAddress(sessionId)?.parentSessionId);
    const knownLead = team?.members.find((member) => member.role === "lead")?.id;
    if (knownLead !== void 0)
      return knownLead;
    let current = sessionId;
    const seen = /* @__PURE__ */ new Set();
    while (!seen.has(current)) {
      seen.add(current);
      const parent = sessions.subagentAddress(current)?.parentSessionId;
      if (parent === void 0)
        break;
      current = parent;
    }
    return current;
  };
  const recovery = createTeamProjectionRecovery(leadSessionId, async (sessionId, signal) => {
    const result = await ctx.remote.session.projections({ sessionId }, signal);
    if (!result.ok)
      throw new Error(result.error.message);
    return result.value?.values.agentTeam;
  });
  ctx.effect(() => () => {
    recovery.dispose();
  }, "teamUI.projectionRecovery");
  const actions = {
    useRecoveredTeam: recovery.useRecoveredTeam,
    async refreshTeam(sessionId, force = false) {
      await sessions.refreshProjections(leadSessionId(sessionId));
      if (force || selectTeam(sessions.list.getSnapshot(), sessionId, sessions.subagentAddress(sessionId)?.parentSessionId) === void 0) {
        await recovery.refresh(sessionId);
      }
    },
    roles: createTeamRoleOperations(ctx),
    experts: createTeamExpertOperations(ctx),
    goals: createTeamGoalOperations(ctx, leadSessionId),
    mailbox: createTeamMailboxOperations(ctx, leadSessionId),
    members: createTeamMemberOperations(ctx, leadSessionId),
    taskArchive: createTeamTaskOperations(ctx, leadSessionId),
    openTeammate(sessionId, childSessionId) {
      const parentSessionId = leadSessionId(sessionId);
      if ((sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0)
        return;
      if (childSessionId === parentSessionId) {
        ctx.uiWorkspace.openSession(parentSessionId);
        return;
      }
      ctx.uiWorkspace.openSession({
        parentSessionId: sessions.list.getSnapshot().projectionsBySession[parentSessionId]?.values.agentTeam?.members.find((member) => member.id === childSessionId)?.parentId ?? parentSessionId,
        childSessionId,
        ...sessions.subagentAddress(childSessionId) ?? { mode: "continuable" }
      });
    }
  };
  ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
    name: "conversation.session.header.actions",
    id: "agent-team",
    order: -20,
    locale: NS,
    inject: () => actions
  }, TeamAction));
  ctx.slots.inject("conversation.view", () => ctx.slots.register({
    name: "conversation.view",
    id: "agent-team",
    order: 5,
    locale: NS,
    label: () => t("view.title"),
    inject: () => actions
  }, TeamView));
}

// packages/team/modules/ui/lib/types/client/index.js
var inject2 = ["remote"];
async function apply(ctx) {
  const unmount = await ctx.remote.$mount(typert_remote_client_default);
  ctx.effect(() => unmount, "client-ui-agent-team: remotes");
  await ctx.plugin({ inject, apply: registerAgentTeamUi }).await();
}

return module.exports;}});
