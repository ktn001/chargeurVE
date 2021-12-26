<?php

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

if (!isConnect('admin')) {
    throw new Exception('{{401 - Accès non autorisé}}');
}
?>

<div id="mod_chargeurNameAndType">
  <form class="form-horizontal">
    <fieldset>
      <div class="form-group">
        <input class='eqLogicAttr' data-l1key='logicalId' value='chargeur' style='display:none'></input>
        <label class="control-label col-sm-3">{{Nom}}:</label>
        <input class="eqLogicAttr col-sm-8" data-l1key='name' type="text" placeholder="{{Nom}}"></input>
      </div>
      <div class="form-group">
        <label class="control-label col-sm-3">{{Type}}:</label>
        <select class="eqLogicAttr col-sm-8" data-l1key='configuration' data-l2key='type'>
        </select>
      </div>
    </fieldset>
  </form>
</div>

<script>
function mod_chargeurNameAndType_actualizeTypes() {
    $.ajax({
        type: 'POST',
        url: 'plugins/chargeurVE/core/ajax/chargeurVE.ajax.php',
        data: {
            action: 'typeLabels',
	    onlyEnable: 1,
        },
        dataType: 'json',
        global: false,
        error: function (request, status, error) {
            handleAjaxError(request, status, error);
        },
        success: function (data) {
            if (data.state != 'ok') {
                $('#div_alert').showAlert({message: data.result, level: 'danger'});
                return;
            }
            $('#mod_chargeurNameAndType select').empty();
            labels = json_decode(data.result);
            for (type in labels) {
                option = '<option value="' + type + '">' + labels[type] + '</option>';
                $('#mod_chargeurNameAndType select').append(option);
            }
        },
    });
}

function mod_chargeurNameAndType(action) {
    if (action = 'result') {
        return $('#mod_chargeurNameAndType').getValues('.eqLogicAttr');
    }
}

$('#mod_chargeurNameAndType').dialog({
    focus: function (event, ui) {
	    mod_chargeurNameAndType_actualizeTypes();
    }
})

</script>
