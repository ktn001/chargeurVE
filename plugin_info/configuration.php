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

require_once dirname(__FILE__) . '/../../../core/php/core.inc.php';
include_file('core', 'authentification', 'php');
if (!isConnect()) {
  include_file('desktop', '404', 'php');
  die();
}
include_file('core', 'chargeurVE', 'class', 'chargeurVE');
sendVarToJS('usedTypes',type::allUsed());
$defaultTagColor = config::getDefaultConfiguration('chargeurVE')['chargeurVE']['defaultTagColor'];
$defaultTextTagColor = config::getDefaultConfiguration('chargeurVE')['chargeurVE']['defaultTextTagColor'];
$defaultPort = config::getDefaultConfiguration('chargeurVE')['chargeurVE']['daemon::port'];
?>

<form class="form-horizontal">
  <fieldset>
    <div class="form-group">
      <div class='col-sm-6'>

        <legend class='col-sm-12'><i class="fas fa-university"></i> {{Démon}}:</legend>
        <label class="col-sm-2 control-label">
          {{Port}}
          <sup><i class="fas fa-question-circle" title="{{Redémarrer le démon en cas de modification}}"></i></sup>
        </label>
        <input class="configKey form-control col-sm-4" data-l1key="daemon::port" placeholder="<?php echo $defaultPort ?>"/>
        <legend class='col-sm-12'><i class="fas fa-laptop"></i> {{Interface}}</legend>
        <label class="col-sm-2 control-label">{{Confirme}}</label>
        <label class='col-sm-10'>
          <input class="configKey" type="checkbox" data-l1key="confirmDelete"/>
          {{Suppressions}}
          <sup><i class="fas fa-question-circle" title="{{Demande de confirmation en cas de suppression d'un élément}}"></i></sup>
        </label>
      </div>
      <div class='col-sm-6'>
        <legend><i class="fas fa-charging-station"></i> {{Les types de chargeurs}}:</legend>
        <table class='table table-bordered'>
          <thead>
            <tr>
              <th>{{Type}}</th>
              <th style='text-align:center'>{{Activer}}</th>
              <th style='text-align:center'>{{Couleurs personnalisées}}</th>
              <th style='text-align:center'>{{Couleur du tag}}</th>
              <th style='text-align:center'>{{Couleur du texte du tag}}</th>
            </tr>
          </thead>
          <tbody>
            <?php
            foreach (type::all(false) as $typeName => $type) {
              if ($typeName[0] == '_') {
                continue;
              }
              $config = config::byKey('type::' . $typeName,'chargeurVE');
              if ($config == '') {
                $cfg['tagColor'] = $defaultTagColor;
                $cfg['tagTextColor'] = $defaultTextTagColor;
                config::save('type::' . $type['type'],$cfg,'chargeurVE');
              }
              echo '<tr>';
              echo '<td>' . $type['label'] . '</td>';
              echo '<td style="text-align:center"><input class="configKey" type="checkbox" data-l1key="type::' . $typeName . '" data-l2key="enabled"/></td>';
              echo '<td style="text-align:center"><input class="configKey" type="checkbox" data-l1key="type::' . $typeName . '" data-l2key="customColor"/></td>';
              echo '<td style="text-align:center"><input class="configKey" type="color" data-l1key="type::' . $typeName . '" data-l2key="tagColor"/></td>';
              echo '<td style="text-align:center"><input class="configKey" type="color" data-l1key="type::' . $typeName . '" data-l2key="tagTextColor"/></td>';
              echo '</tr>';
            }
            ?>
          </tbody>
        </table>
      </div>
    </div>
  </fieldset>
</form>

<script>
$(".configKey[data-l1key^='type::'][data-l2key='enabled']").on('change',function(){
	if ($(this).value() == 1) {
		return;
	}
	type = $(this).attr('data-l1key').slice(6);
	if (usedTypes.indexOf(type) != -1) {
		$(this).value(1);
		bootbox.alert({title: "{{Désactivation impossible.}}", message: "{{Il existe au moins un compte de ce type.}}"});
	}

});
</script>
