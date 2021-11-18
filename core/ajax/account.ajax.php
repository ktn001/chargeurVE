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

try {
	require_once __DIR__ . '/../../../../core/php/core.inc.php';
	require_once __DIR__ . '/../class/account.class.php';

	include_file('core', 'authentification', 'php');

	if (!isConnect('admin')) {
		throw new Exception(__('401 - Accès non autorisé', __FILE__));
	}

	if (init('action') == 'byId') {
		$type = init('type');
		$id = init('id');
		if ($type == ''){
			throw new Exception(__("Le type de compte n'est pas indiqué",__FILE__));
		}
		if ($id == '') {
			$classe = $type . 'Account';
			$account = new $classe();
		} else {
			$account = account::byId($id);
		}
		if (!is_object($account)) {
			throw new Exception(__('Compte inconnu: ',__FILE__) . $id);
		}
		if ($account->getType() != $type) {
			throw new Exception(__("Le type du compte n'est pas ",__FILE__) . '"' . $type . '" (' . $account->getType() . ')');
		}
		ajax::success(utils::o2a($account));
	}

	if (init('action') == 'save') {
		$data = json_decode(init('account'),true);
		if ($data['type'] == ''){
			throw new Exception(__("Le type de compte n'est pas indiqué",__FILE__));
		}
		$classe = $data['type'] . 'Account';
		if ($data['id'] == '') {
			$account = new $classe();
		} else {
			$account = account::byId($data['id']);
		}
		utils::a2o($account,$data);
		$account->save();
		ajax::success();
	}

	if (init('action') == 'remove') {
		$id = init('accountId');
		$account = account::byId($id);
		$account->remove();
		ajax::success();
	}

	if (init('action') == 'displayCards') {
		$cards = array ();
		foreach (account::all() as $account) {
			$data = array(
				'isEnable' => $account->getIsEnable(),
				'id' => $account->getId(),
				'type' => $account->getType(),
				'humanName' => $account->getHumanName(true,true),
				'image' => $account->getImage(),
			);
			$cards[] = $data;
		}
		ajax::success(json_encode($cards));
	}

	if (init('action') == 'getAccountToSelect') {
		$result = array();
		foreach (account::byType(init('type')) as $account) {
			$data = array(
				'id' => $account->getId(),
				'value' => $account->getHumanName(),
			);
			$result[] = $data;
		}
		ajax::success(json_encode($result));
	}

	throw new Exception(__('Aucune méthode correspondante à : ', __FILE__) . init('action'));

	/*     * *********Catch exeption*************** */
} catch (Exception $e) {
	ajax::error(displayException($e), $e->getCode());
}

