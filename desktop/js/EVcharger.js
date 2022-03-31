
/* This file is part of Jeedom.
 *
 * Jeedom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Jeedom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Jeedom. If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * Permet la réorganisation des commandes dans l'équipement et des accounts
 */
$('#table_cmd_account, #table_cmd_charger, #table_cmd_vehicle').sortable({
	axis: 'y',
	cursor: 'move',
	items: '.cmd',
	placeholder: 'ui-state-highlight',
	tolerance: 'intersect',
	forcePlaceholderSize: true
});
$('#table_cmd_account, #table_cmd_charger, #table_cmd_vehicle').on('sortupdate',function(event,ui){
		modifyWithoutSave = true;
});

/*
 * Chargement des acountDisplayCards
 */
function loadAccountCards() {
	$.ajax({
		type: 'POST',
		url: 'plugins/EVcharger/core/ajax/account.ajax.php',
		data: {
			action: 'displayCards',
		},
		dataType : 'json',
		global:false,
		error: function (request, status, error) {
			handleAjaxError(request, status, error);
		},
		success: function (data) {
			if (data.state != 'ok') {
				$('#div_alert').showAlert({message: data.result, level: 'danger'});
				return;
			}
			accounts = json_decode(data.result);
			$('#accounts-div.eqLogicThumbnailContainer').empty();
			for (account of accounts) {
				let opacity = (account.enabled == 1) ? '' : 'disableCard';
				let html = '<div class="accountDisplayCard cursor ' + opacity + '" data-account_id="' + account.id + '" data-account_model="' + account.model + '">';
				html += '<img src="' + account.image + '"/>';
				html += '<br/>';
				html += '<span class="name">' + account.humanName + '</span>';
				html += '</div>';
				$('#accounts-div.eqLogicThumbnailContainer').append(html);
				$('#accounts-div.eqLogicThumbnailContainer').packery('reloadItems').packery();
			}
		}
	});
}

/*
 * Suppression d'un compte
 */
function deleteAccount (accountId) {
	$.ajax({
		type: 'POST',
		url: 'plugins/EVcharger/core/ajax/account.ajax.php',
		data: {
			action: 'remove',
			accountId: accountId,
		},
		dataType: 'json',
		global: false,
		error: function (request, status, error) {
			handleAjaxError(request, status, error);
			loadAccountCards();
		},
		success: function (data) {
			if (data.state != 'ok') {
				$('#div_alert').showAlert({message: data.result, level: 'danger'});
				return;
			}
			$('#mod_editAccount').dialog("close");
			loadAccountCards();
		}
	})
}

/*
 * Enregistrement d'un account avec saisie de password
 */
function saveWithPassword(account) {
	bootbox.prompt({
		title: "{{Password:}}",
		inputType: "password",
		callback: function(password){
			if ( password === null) {
				return;
			}
			$.ajax({
				type: 'POST',
				url: 'plugins/EVcharger/core/ajax/account.ajax.php',
				data: {
					action: 'save',
					account: account,
					options: json_encode({password : password})
				},
				dataType: 'json',
				global: false,
				error: function (request, status, error) {
					handleAjaxError(request, status, error);
					loadAccountCards();
				},
				success: function (data) {
					if (data.state != 'ok') {
 						$('#div_alert').showAlert({message: data.result, level: 'danger'});
						return;
					}
 					$('#div_alert').showAlert({message: '{{Sauvegarde réussie}}', level: 'success'});
 					$('#mod_editAccount').dialog("close");
 					loadAccountCards();
				}
			});
		}
	});
}

/*
 * Saisie des nom et modèle d'un nouveau compte ou chargeur
 */
function getNameAndModelAndSave (title, eqLogicType) {
	if ($('#modContainer_nameAndModel').length == 0) {
		$('body').append('<div id="modContainer_nameAndModel" title="' + title + '"></div>');
		jQuery.ajaxSetup({async: false});
		$('#modContainer_nameAndModel').load('index.php?v=d&plugin=EVcharger&modal=nameAndModel');
		jQuery.ajaxSetup({async: true});
		$("#modContainer_nameAndModel").dialog({
			closeText: '',
			autoOpen: false,
			modal: true,
			height:200,
			width:400
		});
	}
	$('#modContainer_nameAndModel').dialog('option', 'buttons', {
		"{{Annuler}}": function () {
			$(this).dialog("close");
		},
		"{{Valider}}": function () {
			let chargers = mod_nameAndModel('result');
			if ( chargers[0].name != '') {
				$(this).dialog("close");
			 	jeedom.eqLogic.save({
					type: eqLogicType,
					eqLogics: chargers,
					error: function(error) {
						$('#div_alert').showAlert({message: error.message, level: 'danger'});
					},
					success: function(_data) {
						let vars = getUrlVars();
						let url = 'index.php?';
						for (var i in vars) {
							if (i != 'id' && i != 'saveSuccessFull' && i != 'removeSuccessFull') {
								url += i + '=' + vars[i].replace('#', '') + '&';
							}
						}
						modifyWithoutSave = false;
						url += 'id=' + _data.id + '&saveSuccessFull=1';
						loadPage(url);
					}
				})
			}
		}
	});
	mod_nameAndModel('init');
	$('#modContainer_nameAndModel').dialog('open');
}

/*
 * Edition d'un account
 */
function editAccount (model, accountId ='') {
  	if (model === undefined) {
  		$('#div_alert').showAlert({message: "{{Modèle pas défini!}}", level: 'danger'});
  		return;
  	}

	if ($('#mod_editAccount').length == 0){
 		$('body').append("<div id='mod_editAccount' title='{{Compte pour modèle:}} '" + modelLabels[model] + '"/>');
 		$('#mod_editAccount').dialog({
 			closeText: '',
 			autoOpen: false,
 			modal: true,
 			height:300,
 			width:680
 		});
 		jQuery.ajaxSetup({async: false});
 		$('#mod_editAccount').load('index.php?v=d&plugin=EVcharger&modal=edit_account');
 		jQuery.ajaxSetup({async: true});
	}
 	$.ajax({
 		type: 'POST',
 		url: 'plugins/EVcharger/core/ajax/account.ajax.php',
 		data: {
 			action: 'byIdToEdit',
 			id: accountId,
 			model: model
 		},
 		dataType : 'json',
 		global:false,
 		error: function (request, status, error) {
 			handleAjaxError(request, status, error);
 		},
 		success: function (data) {
 			if (data.state != 'ok') {
 				$('#div_alert').showAlert({message: data.result, level: 'danger'});
 				return;
 			}
			result = json_decode(data.result);
			mod_editAccount.build(result.params, result.images);
 			$('#mod_editAccount .accountAttr').value('');
 			$('#mod_editAccount').setValues(result.account,'.accountAttr');
			$('#mod_editAccount').dialog('option','title','{{Compte modèle:}} ' + modelLabels[result.account.model]);
 		}
 	});
 	let buttons = []
 	buttons.push( {
 		text: "{{Annuler}}",
 		click: function() {
 			$(this).dialog("close");
 		}
 	});
 	buttons.push( {
 		text: "{{Sauvegarder}}",
 		click: function () {
 			account =  json_encode($('#mod_editAccount').getValues('.accountAttr')[0]);
 			$.ajax({
 				type: 'POST',
 				url: 'plugins/EVcharger/core/ajax/account.ajax.php',
 				data: {
 					action: 'save',
 					account: account
 				},
 				dataType: 'json',
 				global: false,
 				error: function (request, status, error) {
 					handleAjaxError(request, status, error);
 					loadAccountCards();
 				},
 				success: function (retour) {
 					if (retour.state != 'ok') {
						if (retour.code == 1) {
							let response = json_decode(retour.result);
							saveWithPassword(response.account);
 							$('#div_alert').showAlert({message: response.message, level: 'warning'});
							return;
						} else {
 							$('#div_alert').showAlert({message: retour.result, level: 'danger'});
 							return;
						}
 					}
 					$('#div_alert').showAlert({message: '{{Sauvegarde réussie}}', level: 'success'});
 					$('#mod_editAccount').dialog("close");
 					loadAccountCards();
 				}
 			});
 		}
 	});
 	if ( accountId != '') {
 		buttons.push( {
 			text: "{{Supprimer}}",
 			class: 'delete',
 			click: function() {
 				if (confirmDelete == 1) {
 					bootbox.confirm('{{Êtes-vous sûr de vouloir supprimer ce compte ?}}', function(result) {
 						if (result) {
 							deleteAccount($('#mod_editAccount .accountAttr[data-l1key="id"]').value());
 						}
 					});
 				} else {
 					deleteAccount($('#mod_editAccount .accountAttr[data-l1key="id"]').value());
 				}
 			}
 		});
 	};
 	$('#mod_editAccount').dialog('option', 'buttons', buttons);
 	$('.delete').attr('style','background-color:var(--al-danger-color) !important');
 	$('#mod_editAccount').dialog('open');
}

/*
 * Chargement initial des accounts
 */
loadAccountCards();

/*
 * Action du bouton d'ajout d'un account
 */
$('.accountAction[data-action=add]').off('click').on('click', function() {
	if ($('#mod_selectAccountModel').length == 0) {
		$('body').append('<div id="mod_selectAccountModel" title="{{Sélection d\'un modèle}}"/>');
		$("#mod_selectAccountModel").dialog({
			closeText: '',
			autoOpen: false,
			modal: true,
			height:200,
			width:300
		});
		jQuery.ajaxSetup({async: false});
		$('#mod_selectAccountModel').load('index.php?v=d&plugin=EVcharger&modal=selectAccountModel');
		jQuery.ajaxSetup({async: true});
	}
	$('#mod_selectAccountModel').dialog('option', 'buttons', {
		"{{Annuler}}": function () {
			$(this).dialog("close");
		},
		"{{Valider}}": function () {
			$(this).dialog("close");
			editAccount(selectAccountModel('result'));
		}
	});
	$('#mod_selectAccountModel').dialog('open');
});

/*
 * Recherche d'account
 */
$('#in_searchAccount').off('keyup').keyup(function() {
	var search = $(this).value()
	if (search == '') {
		$('.accountDisplayCard').show()
		return
	}
	$('.accountDisplayCard').hide()
	search = jeedomUtils.normTextLower(search)
	var text
	$('.accountDisplayCard').each(function() {
		text = jeedomUtils.normTextLower($(this).text())
		if  (text.indexOf(search) >= 0) {
			$(this).closest('.accountDisplayCard').show()
		}
	})
})

/*
 * Remise à zéro de la recherche d'account
 */
$('#bt_resetSearchAccount').on('click', function() {
	$('#in_searchAccount').val('').keyup()
})

/*
 * Action click sur account Display card
 */
$('#accounts-div.eqLogicThumbnailContainer').off('click').on('click','.accountDisplayCard', function () {
	account_id = $(this).attr("data-account_id");
	account_model = $(this).attr("data-account_model");
	editAccount(account_model, account_id);
});

/*
 * Action du bouton d'ajout d'un compte
 */
$('.accountAction[data-action=add').off('click').on('click',function () {
	getNameAndModelAndSave ("Nouveau compte", accountType);
});

/*
 * Action du bouton d'ajout d'un chargeur
 */
$('.chargerAction[data-action=add').off('click').on('click',function () {
	getNameAndModelAndSave ("Nouveau chargeur", chargerType);
});

/*
 * Action du bouton d'ajout d'un véhicule
 */
$('.vehicleAction[data-action=add').off('click').on('click',function () {
	if ($('#modContainer_vehicleName').length == 0) {
		$('body').append('<div id="modContainer_vehicleName" title="{{Nouveau Véhicule:}}"/>');
		jQuery.ajaxSetup({async: false});
		$('#modContainer_vehicleName').load('index.php?v=d&plugin=EVcharger&modal=vehicleName');
		jQuery.ajaxSetup({async: true});
		$("#mod_vehicleName").dialog({
			closeText: '',
			autoOpen: false,
			modal: true,
			height:200,
			width:400
		});
		$('#mod_vehicleName').dialog('option', 'buttons', {
			"{{Annuler}}": function () {
				$(this).dialog("close");
			},
			"{{Valider}}": function () {
				let vehicles = mod_vehicleName('result');
				if ( vehicles[0].name != '') {
					$(this).dialog("close");
				 	jeedom.eqLogic.save({
						type: vehicleType,
						eqLogics: vehicles,
						error: function(error) {
							$('#div_alert').showAlert({message: error.message, level: 'danger'});
						},
						success: function(_data) {
							let vars = getUrlVars();
							let url = 'index.php?';
							for (var i in vars) {
								if (i != 'id' && i != 'saveSuccessFull' && i != 'removeSuccessFull') {
									url += i + '=' + vars[i].replace('#', '') + '&';
								}
							}
							modifyWithoutSave = false;
							url += 'id=' + _data.id + '&saveSuccessFull=1';
							loadPage(url);
						}
					})
				}
			}
		})
	}
	$('#mod_vehicleName').dialog('open');
});

/*
 * Action sur modification d'image d'un compte
 */
$('#selectAccountImg').on('change',function(){
	$('#account_icon_visu').attr('src', $(this).value());
});

/*
 * Action sur modification d'image d'un chargeur
 */
$('#selectChargerImg').on('change',function(){
	$('#charger_icon_visu').attr('src', $(this).value());
});

/*
 * Action sur modification du type de véhicule
 */
$('#selectVehicleImg').on('change',function(){
	path = '/plugins/EVcharger/desktop/img/vehicle/' + $(this).value() + '.png';
	$('#vehicle_icon_visu').attr('src', path);
});

/*
 * Action sur mise à jour des commandes
 */
$('.cmdAction[data-action=actualize]').on('click',function() {
	if (checkPageModified()) {
		return;
	}
	$.ajax({
		type: 'POST',
		url: 'plugins/EVcharger/core/ajax/EVcharger.ajax.php',
		data: {
			action: 'updateCmds',
			id:  $('.eqLogicAttr[data-l1key=id]').value(),
		},
		dataType : 'json',
		global:false,
		error: function (request, status, error) {
			handleAjaxError(request, status, error);
		},
		success: function (data) {
			if (data.state != 'ok') {
				$('#div_alert').showAlert({message: data.result, level: 'danger'});
				return;
			}
			modifyWithoutSave = false
			let vars = getUrlVars()
			let url = 'index.php?'
			for (let i in vars) {
				if (i != 'saveSuccessFull' && i != 'removeSuccessFull') {
					url += i + '=' + vars[i] + '&'
				}
			}
			url += 'saveSuccessFull=1' + document.location.hash
			loadPage(url)
		}
	});
})

$('#table_cmd_charger, #table_cmd_vehicle').delegate('.listEquipementAction', 'click', function(){
	var el = $(this)
	var subtype = $(this).closest('.cmd').find('.cmdAttr[data-l1key=subType]').value()
	var type = $(this).closest('.cmd').find('.cmdAttr[data-l1key=type]').value()
	jeedom.cmd.getSelectModal({cmd: {type: type}}, function(result) {
		var calcul = el.closest('tr').find('.cmdAttr[data-l1key=configuration][data-l2key=' + el.attr('data-input') + ']')
		calcul.atCaret('insert',result.human)
	})
})

/*
* Fonction permettant l'affichage des commandes dans l'équipement
*/
function addCmdToChargerTable(_cmd) {
	if (init(_cmd.logicalId) == 'refresh'){
		return;
	}
	let isStandard = false;
	let isMandatory
	if ('mandatory' in _cmd.configuration) {
		isStandard = true;
		isMandatory = (_cmd.configuration.mandatory == '1');
	}
	let  tr = '<tr class="cmd" data-cmd_id="' + init(_cmd.id) + '">';
	tr += '<td class="hidden-xs">';
	tr += '<span class="cmdAttr" data-l1key="id"></span>';
	tr += '</td>';
	tr += '<td>';
	tr += '  <input class="cmdAttr form-control input-sm" data-l1key="name" placeholder="{{Nom de la commande}}" style="margin-bottom:3px">';
	if (isStandard) {
		tr += '  <input class="cmdAttr form-control input-sm" data-l1key="logicalId" style="margin-top:5px" disabled>';
	}
	tr += '</td>';
	tr += '<td>';
	tr += '  <a class="cmdAction btn btn-default btn-sm" data-l1key="chooseIcon"><i class="fas fa-flag"></i> {{Icône}}</a>';
	tr += '  <span class="cmdAttr" data-l1key="display" data-l2key="icon" style="margin-left : 10px;"></span>';
	tr += '  <select class="cmdAttr form-control input-sm" data-l1key="value" style="display : none;margin-top : 5px;" title="{{Commande information liée}}">';
	tr += '    <option value="">{{Aucune}}</option>';
	tr += '  </select>';
	tr += '</td>';
	tr += '<td>';
	if (isStandard ) {
		tr += '<input class="cmdAttr form-control input-sm" data-l1key="type" style="width:120px; margin-bottom:3px" disabled>';
		tr += '<input class="cmdAttr form-control input-sm" data-l1key="subType" style="width:120px; margin-top:5px" disabled>';
	} else {
		tr += '<span class="type" type="' + init(_cmd.type) + '">' + jeedom.cmd.availableType() + '</span>';
		tr += '<span class="subType" subType="' + init(_cmd.subType) + '"></span>';
	}
	tr += '</td>';
	tr += '<td>';
	if (!isStandard || _cmd.configuration.hasOwnProperty('calcul')) {
		tr += '<textarea class="cmdAttr form-control input-sm" data-l1key="configuration" data-l2key="calcul" style="height:35px"></textarea>';
	}
	tr += '</td>';
	tr += '<td>';
	tr += '<label class="checkbox-inline"><input type="checkbox" class="cmdAttr checkbox-inline" data-l1key="isVisible" checked/>{{Afficher}}</label>';
	tr += '<label class="checkbox-inline"><input type="checkbox" class="cmdAttr checkbox-inline" data-l1key="isHistorized" checked/>{{Historiser}}</label>';
	tr += '<label class="checkbox-inline"><input type="checkbox" class="cmdAttr" data-l1key="display" data-l2key="invertBinary"/>{{Inverser}}</label>';
	tr += '<div style="margin-top:7px">';
	tr += '<input class="tooltips cmdAttr form-control input-sm" data-l1key="configuration" data-l2key="minValue" placeholder="{{Min.}}" title="{{Min.}}" style="width:30%;max-width:80px;display:inline-block;margin-right:2px"/>';
	tr += '<input class="tooltips cmdAttr form-control input-sm" data-l1key="configuration" data-l2key="maxValue" placeholder="{{Max.}}" title="{{Max.}}" style="width:30%;max-width:80px;display:inline-block;margin-right:2px"/>';
	tr += '<input class="tooltips cmdAttr form-control input-sm" data-l1key="unite" placeholder="{{Unité}}" title="{{Unité}}" style="width:30%;max-width:80px;display:inline-block;margin-right:2px;display:inline-block;margin-right:2px"/>';
	tr += '</div>';
	tr += '</td>';
	tr += '<td>';
	if (is_numeric(_cmd.id)) {
		tr += '<a class="btn btn-default btn-xs cmdAction" data-action="configure"><i class="fas fa-cogs"></i></a> ';
		tr += '<a class="btn btn-default btn-xs cmdAction" data-action="test"><i class="fas fa-rss"></i> Tester</a>';
	}
	if (!isMandatory) {
		tr += '<i class="fas fa-minus-circle pull-right cmdAction cursor" data-action="remove"></i>';
	}
	tr += '</td>';
	tr += '</tr>';
	$('#table_cmd_charger tbody').append(tr);
	tr = $('#table_cmd_charger tbody tr').last();
	if (isStandard){
		tr.find('.cmdAttr[data-l1key=unite]:visible').prop('disabled',true);
		tr.find('.cmdAttr[data-l1key=configuration][data-l2key=minValue]:visible').prop('disabled',true);
		tr.find('.cmdAttr[data-l1key=configuration][data-l2key=maxValue]:visible').prop('disabled',true);
		tr.find('.cmdAttr[data-l1key=configuration][data-l2key=calcul]').prop('disabled',true);
	}
	jeedom.eqLogic.buildSelectCmd({
		id:  $('.eqLogicAttr[data-l1key=id]').value(),
		filter: {type: 'info'},
		error: function (error) {
			$('#div_alert').showAlert({message: error.message, level: 'danger'});
		},
		success: function (result) {
			tr.find('.cmdAttr[data-l1key=value]').append(result);
			tr.setValues(_cmd, '.cmdAttr');
			jeedom.cmd.changeType(tr, init(_cmd.subType));
		}
	});
}

function addCmdToVehicleTable(_cmd) {
	let  tr = '<tr class="cmd" data-cmd_id="' + init(_cmd.id) + '">';
	tr += '<td class="hidden-xs">';
	tr += '<span class="cmdAttr" data-l1key="id"></span>';
	tr += '</td>';
	tr += '<td>';
	tr += '  <input class="cmdAttr form-control input-sm" data-l1key="name" placeholder="{{Nom de la commande}}" style="margin-bottom:3px">';
	tr += '  <input class="cmdAttr form-control input-sm" data-l1key="logicalId" style="margin-top:5px" disabled>';
	tr += '</td>';
	tr += '<td>';
	tr += '  <input class="cmdAttr form-control input-sm" data-l1key="type" style="width:120px; margin-bottom:3px" disabled>';
	tr += '  <input class="cmdAttr form-control input-sm" data-l1key="subType" style="width:120px; margin-top:5px" disabled>';
	tr += '</td>';
	tr += '<td>';
	tr += '  <div class="input-group" style="margin-bottom:5px">';
	if (_cmd.type == 'info') {
		tr += '    <input class="cmdAttr form-control input-sm roundedleft" data-l1key="configuration" data-l2key="calcul" placeholder="Commande liée">';
		tr += '    <span class="input-group-btn">';
		tr += '      <a class="btn btn-default btn-sm listEquipementAction roundedRight" data-input="calcul">';
		tr += '        <i class="fas fa-list-alt"></i>';
		tr += '      </a>';
		tr += '    </span>';
	} else {
		tr += '    <input class="cmdAttr form-control input-sm roundedleft" data-l1key="configuration" data-l2key="linkedCmd" placeholder="Commande a exécuter">';
		tr += '    <span class="input-group-btn">';
		tr += '      <a class="btn btn-default btn-sm listEquipementAction roundedRight" data-input="linkedCmd">';
		tr += '        <i class="fas fa-list-alt"></i>';
		tr += '      </a>';
		tr += '    </span>';
	}
	tr += '  </div>';
	tr += '</td>';
	tr += '<td>';
	if (is_numeric(_cmd.id)) {
		tr += '<a class="btn btn-default btn-xs cmdAction" data-action="configure"><i class="fas fa-cogs"></i></a> ';
		tr += '<a class="btn btn-default btn-xs cmdAction" data-action="test"><i class="fas fa-rss"></i> Tester</a>';
	}
	tr += '<i class="fas fa-minus-circle pull-right cmdAction cursor" data-action="remove"></i>';
	tr += '</td>';
	tr += '</tr>';
	$('#table_cmd_vehicle tbody').append(tr);
	tr = $('#table_cmd_vehicle tbody tr').last();
	jeedom.eqLogic.buildSelectCmd({
		id:  $('.eqLogicAttr[data-l1key=id]').value(),
		filter: {type: 'info'},
		error: function (error) {
			$('#div_alert').showAlert({message: error.message, level: 'danger'});
		},
		success: function (result) {
			tr.find('.cmdAttr[data-l1key=value]').append(result);
			tr.setValues(_cmd, '.cmdAttr');
			jeedom.cmd.changeType(tr, init(_cmd.subType));
		}
	});
}

function addCmdToTable(_cmd) {
	if (!isset(_cmd)) {
		var _cmd = {configuration: {}};
	}
	if (!isset(_cmd.configuration)) {
		_cmd.configuration = {};
	}
	if (init(_cmd.eqType) == 'EVcharger_charger') {
		addCmdToChargerTable(_cmd);
		return;
	}
	if (init(_cmd.eqType) == 'EVcharger_vehicle') {
		addCmdToVehicleTable(_cmd);
	}
}

/*
 * Chargement de la liste des choix des accounts
 */
function loadSelectAccount(defaut) {
	$.ajax({
		type: 'POST',
		url: 'plugins/EVcharger/core/ajax/account.ajax.php',
		data: {
			action: 'getAccountToSelect',
			model: $('.eqLogicAttr[data-l1key=configuration][data-l2key=model]').value(),
		},
		dataType : 'json',
		global:false,
		error: function (request, status, error) {
			handleAjaxError(request, status, error);
		},
		success: function (data) {
			if (data.state != 'ok') {
				$('#div_alert').showAlert({message: data.result, level: 'danger'});
				return;
			}
			$('#selectAccount').empty();
			datas = json_decode(data.result);
			content = "";
			for (let data of datas) {
				content += '<option value="' + data.id + '">' + data.value + '</option>';
			}
			$('#selectAccount').append(content).val(defaut).trigger('change');
		}
	});
}

function loadSelectAccountImg(defaut) {
	$.ajax({
		type: 'POST',
		url: 'plugins/EVcharger/core/ajax/account.ajax.php',
		data: {
			action: 'images',
			model: $('.eqLogicAttr[data-l1key=configuration][data-l2key=model]').value(),
		},
		dataType : 'json',
		global:false,
		error: function (request, status, error) {
			handleAjaxError(request, status, error);
		},
		success: function (data) {
			if (data.state != 'ok') {
				$('#div_alert').showAlert({message: data.result, level: 'danger'});
				return;
			}
			$('#selectAccountImg').empty();
			let images = json_decode(data.result);
			let options = "";
			for (image of images) {
				splitPath = image.split('/').reverse();
				if (splitPath[1] != 'img') {
					display = splitPath[1] + '/' + splitPath[0];
				} else {
					display = splitPath[0];
				}
				options += '<option value="' + image + '">' + display + '</option>';
			}
			$('#selectAccountImg').append(options).val(defaut).trigger('change');
		}
	})
}

function loadSelectChargerImg(defaut) {
	$.ajax({
		type: 'POST',
		url: 'plugins/EVcharger/core/ajax/EVcharger.ajax.php',
		data: {
			action: 'images',
			model: $('.eqLogicAttr[data-l1key=configuration][data-l2key=model]').value(),
		},
		dataType : 'json',
		global:false,
		error: function (request, status, error) {
			handleAjaxError(request, status, error);
		},
		success: function (data) {
			if (data.state != 'ok') {
				$('#div_alert').showAlert({message: data.result, level: 'danger'});
				return;
			}
			$('#selectChargerImg').empty();
			let images = json_decode(data.result);
			let options = "";
			for (image of images) {
				splitPath = image.split('/').reverse();
				if (splitPath[1] != 'img') {
					display = splitPath[1] + '/' + splitPath[0];
				} else {
					display = splitPath[0];
				}
				options += '<option value="' + image + '">' + display + '</option>';
			}
			$('#selectChargerImg').append(options).val(defaut).trigger('change');
		}
	})
}

function prePrintEqLogic (id) {
	let displayCard = $('.eqLogicDisplayCard[data-eqlogic_id=' + id + ']')
	let type = displayCard.attr('data-eqlogic_type');
	$('#account_icon_visu, #charger_icon_visu, #vehicle_icon_visu').attr('src','')
	$('.tab-EVcharger_account, .tab-EVcharger_vehicle, .tab-EVcharger_charger').hide()
	$('.EVcharger_accountAttr, .EVcharger_vehicleAttr, .EVcharger_chargerAttr').removeClass('eqLogicAttr')
	if (type =='EVcharger_account') {
		$('.tab-EVcharger_account').show()
		$('.EVcharger_accountAttr').addClass('eqLogicAttr')
	} else if (type =='EVcharger_charger') {
		$('.tab-EVcharger_charger').show()
		$('.EVcharger_chargerAttr').addClass('eqLogicAttr')
		model = displayCard.attr('data-eqlogic_model');
		$.ajax({
			type: 'POST',
			url: 'plugins/EVcharger/core/ajax/EVcharger.ajax.php',
			data: {
				action: 'chargerParamsHtml',
				model: model
			},
			dataType: 'json',
			global: false,
			error: function(request, status, error) {
				handleAjaxError(request, status, error);
			},
			success: function(data) {
				if (data.state != 'ok') {
					$('#div_alert').showAlert({message: data.result, level: 'danger'});
					return;
				}
				let html = data.result;
				$('#ChargerSpecificsParams').html(html);
			}
		});
	} else if (type == 'EVcharger_vehicle') {
		$('.tab-EVcharger_vehicle').show()
		$('.EVcharger_vehicleAttr').addClass('eqLogicAttr')
	}
}

function printEqLogic (configs) {
	if (configs.eqType_name == 'EVcharger_account') {
		loadSelectAccountImg(configs.configuration.image);
	} else if (configs.eqType_name == 'EVcharger_charger') {
		$('.nav-tabs .tab-EVcharger_charger a').first().click()
		loadSelectAccount(configs.configuration.accountId);
		loadSelectChargerImg(configs.configuration.image);
	} else if  (configs.eqType_name == 'EVcharger_vehicle') {
		$('.nav-tabs .tab-EVcharger_vehicle a').first().click()
	}
}
