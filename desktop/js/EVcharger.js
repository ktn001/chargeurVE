
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
$('#table_cmd').sortable({axis: 'y', cursor: 'move', items: '.cmd', placeholder: 'ui-state-highlight', tolerance: 'intersect', forcePlaceholderSize: true});
$('#table_cmd').on('sortupdate',function(event,ui){
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
 * Chargement initial des accounts
 */
loadAccountCards();

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
 * Action click sur account Display card
 */
$('#accounts-div.eqLogicThumbnailContainer').off('click').on('click','.accountDisplayCard', function () {
	account_id = $(this).attr("data-account_id");
	account_model = $(this).attr("data-account_model");
	editAccount(account_model, account_id);
});

/*
 * Action du bouton d'ajout d'un chargeur
 */
$('.chargerAction[data-action=add').off('click').on('click',function () {
	if ($('#modContainer_chargerNameAndModel').length == 0) {
		$('body').append('<div id="modContainer_chargerNameAndModel" title="{{Nouveau chargeur:}}"/>');
		jQuery.ajaxSetup({async: false});
		$('#modContainer_chargerNameAndModel').load('index.php?v=d&plugin=EVcharger&modal=chargerNameAndModel');
		jQuery.ajaxSetup({async: true});
		$("#mod_chargerNameAndModel").dialog({
			closeText: '',
			autoOpen: false,
			modal: true,
			height:200,
			width:400
		});
	}
	$('#mod_chargerNameAndModel').dialog('option', 'buttons', {
		"{{Annuler}}": function () {
			$(this).dialog("close");
		},
		"{{Valider}}": function () {
			let chargers = mod_chargerNameAndModel('result');
			if ( chargers[0].name != '') {
				$(this).dialog("close");
			 	jeedom.eqLogic.save({
					type: eqType,
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
	$('#mod_chargerNameAndModel').dialog('open');
});

/*
 * Action sur modification d'image d'n chargeur
 */
$('#selectChargeurImg').on('change',function(){
	$('[name=icon_visu]').attr('src', $(this).value());
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
			console.log(url)
			loadPage(url)
		}
	});
})

/*
* Fonction permettant l'affichage des commandes dans l'équipement
*/
function addCmdToTable(_cmd) {
	if (!isset(_cmd)) {
		var _cmd = {configuration: {}};
	}
	if (!isset(_cmd.configuration)) {
		_cmd.configuration = {};
	}
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
		tr += '<i class="fas fa-minus-circle pull-right cmdAction cursor" data-action="remove"></i></td>';
	}
	tr += '</tr>';
	$('#table_cmd tbody').append(tr);
	tr = $('#table_cmd tbody tr').last();
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

function loadSelectImg(defaut) {
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
			$('#selectChargeurImg').empty();
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
			$('#selectChargeurImg').append(options).val(defaut).trigger('change');
		}
	})
}

function printEqLogic (configs) {
	loadSelectAccount(configs.configuration.accountId);
	loadSelectImg(configs.configuration.image);
	$.ajax({
		type: 'POST',
		url: 'plugins/EVcharger/core/ajax/EVcharger.ajax.php',
		data: {
			action: 'chargerParamsHtml',
			model: configs.configuration.model
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
			$('#ChargeurSpecificsParams').html(html);
			$('#ChargeurSpecificsParams').setValues(configs, '.eqLogicAttr');
		}
	});
}
