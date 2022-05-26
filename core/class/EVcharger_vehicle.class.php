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

class EVcharger_vehicle extends EVcharger {

    //Retourne la liste des types de véhicule
	public static function types() {
		$types = array();
		$path = __DIR__ . '/../../desktop/img/vehicle';
		if ($dir = opendir($path)){
			while (($fileName = readdir($dir)) !== false){
				if (preg_match('/^([^_]+)\.png$/',$fileName,$matches)){
					$types[] = $matches[1];
				}
			}
		}
		return $types;
	}

	public static function vehiclePlugged ($options) {
		log::add("EVcharger","debug","vehiclePlugged: " . print_r($options,true));
	}

    // Création des listeners
	public function checkListeners() {
		if ($this->getIsEnable() == 0){
			return;
		}
		log::add("EVcharger","info",__("vérification des listeners pour le véhicule ",__FILE__). $this->getHumanName());
		$logicalIds = array(
			'plugged' => 'EvchargerEventHandler',
		);
		foreach ($logicalIds as $logicalId => $function) {
			$listener = listener::byClassAndFunction('EVcharger', $function);
			if (!is_object($listener)) {
				$listener = new listener();
				$listener->setClass('EVcharger');
				$listener->setFunction($function);
			}
			$changed = false;
			$cmds = cmd::byEqLogicIdAndLogicalId($this->getId(),$logicalId,true);
			if (! is_array($cmds)){
				continue;
			}
			foreach ($cmds as $cmd) {
				$listener->addEvent($cmd->getId());
				$changed = true;
			}
		}
		if ($changed){
			$listener->save();
		}
	}

    // Fonction exécutée automatiquement après la création de l'équipement
	public function postInsert() {
		$cmd = (__CLASS__ . "Cmd")::byEqLogicIdAndLogicalId($this->getId(),'refresh');
		if (!is_object($cmd)){
			$cmd = new EVcharger_vehicleCMD();
			$cmd->setEqLogic_id($this->getId());
			$cmd->setName(__('Rafraichir',__FILE__));
			$cmd->setType('action');
			$cmd->setSubType('other');
			$cmd->setLogicalId('refresh');
			$cmd->save();
		}
		$cmd = (__CLASS__ . "Cmd")::byEqLogicIdAndLogicalId($this->getId(),'latitude');
		if (!is_object($cmd)){
			$cmd = new EVcharger_vehicleCMD();
			$cmd->setEqLogic_id($this->getId());
			$cmd->setName(__('Latitude',__FILE__));
			$cmd->setType('info');
			$cmd->setSubType('numeric');
			$cmd->setLogicalId('latitude');
			$cmd->save();
		}
		$cmd = (__CLASS__ . "Cmd")::byEqLogicIdAndLogicalId($this->getId(),'longitude');
		if (!is_object($cmd)){
			$cmd = new EVcharger_vehicleCMD();
			$cmd->setEqLogic_id($this->getId());
			$cmd->setName(__('Longitude',__FILE__));
			$cmd->setType('info');
			$cmd->setSubType('numeric');
			$cmd->setLogicalId('longitude');
			$cmd->save();
		}
		$cmd = (__CLASS__ . "Cmd")::byEqLogicIdAndLogicalId($this->getId(),'plugged');
		if (!is_object($cmd)){
			$cmd = new EVcharger_vehicleCMD();
			$cmd->setEqLogic_id($this->getId());
			$cmd->setName(__('Branché',__FILE__));
			$cmd->setType('info');
			$cmd->setSubType('binary');
			$cmd->setLogicalId('plugged');
			$cmd->save();
		}
	}

	public function postSave() {
		$this->checkListeners();
	}

    // Retourne l'image du véhicule en fonction de son type
	public function getImage() {
		$type = $this->getConfiguration('type');
		$image = "/plugins/EVcharger/desktop/img/vehicle/" . $type . ".png";
		if (! file_exists('/var/www/html' . $image)) {
			return "/plugins/EVcharger/desktop/img/vehicle/compact.png";
		}
		return $image;
	}

	public function isConnected() {
		$connectedCmd = EVcharger_vehicleCmd::byEqLogicIdAndLogicalId($this->getId(),'plugged');
		$connected = $connectedCmd->execCmd();
		if ($connected == 1){
			return true;
		} else {
			return false;
		}
	}

	public function connectionTime() {
		$connectedCmd = EVcharger_vehicleCmd::byEqLogicIdAndLogicaliId($this->getId(),'plugged');
		$connected = $connectedCmd->execCmd();
		if ($connected != 1){
			return 0;
		}
		$connectionDate = $connected->getValueDate();
		$connectionTime = DateTime::createFromFormat("Y-m-d H:i:s", $connectionDate)->getTimeStamp();
		log::add("EVcharger","debug","XX " . $connectionDate . "   " . $connectionTime);
	}

	public function searchConnectedCharger() {
		if (! $this->isConnected()) {
			return 0;
		}
		$connctionTime = $this->getConnectionTime();
		$chargers = EVcharger_charger::byType('EVcharger_charger',true);
		$connectedChargers = array ();
		foreach ($chargers as $charger) {
			if ($charger->isConnected() !== false) {
				$connectedChargers[] = $charger;
			}
		}
	}

    /*     * **********************Getteur Setteur*************************** */

	public function setType($_type) {
		$this->setConfiguration('type',$_type);
		return $this;
	}
}

class EVcharger_vehicleCmd extends EVchargerCmd  {

	public function preSave() {
		if ($this->getType() == 'info'){
			$calcul = $this->getConfiguration('calcul');
			if (strpos($calcul,'#' . $this->getId() . '#') !== false) {
				throw new Exception(__('Vous ne pouvez appeler la commande elle-même (boucle infinie) sur',__FILE__) . ' : ' . $this->getName());
			}
			$added_value = [];
			preg_match_all("/#([0-9]*)#/", $calcul, $matches);
			$value = '';
			foreach ($matches[1] as $cmd_id) {
				if (isset($added_values[$cmd_id])) {
					continue;
				}
				$cmd = self::byId($cmd_id);
				if (is_object($cmd) && $cmd->getType() == 'info') {
					$value .= '#' . $cmd_id . '#';
					$added_value[$cmd_id] = $cmd_id;
				}
			}
			preg_match_all("/variable\((.*?)\)/", $calcul, $matches);
			foreach ($matches[1] as $variable) {
				if (isset($added_values['#variable(' . $variable . ')#'])){
					continue;
				}
				$value .= '#variable(' . $variable . ')#';
				$added_value['#variable(' . $variable . ')#'] = '#variable(' . $variable . ')#';
			}
			$this->setValue($value);
		}
	}

	public function postSave() {
		if ($this->getType() == 'info' && $this->getConfiguration('calcul') != '') {
			$this->event($this->execute());
		}
	}

	public function execute($_options = null) {
		if ($this->getType() == 'info'){
			if ($this->getConfiguration('calcul') != ''){
				try {
					$result = jeedom::evaluateExpression($this->getConfiguration('calcul'));
					if(is_string($result)){
						$result = str_replace('"', '', $result);
					}
					if (in_array($this->getLogicalId(), array('latitude', 'longitude'))){
						if (preg_match('/^\s*([-+]?[\d\.:]+)\s*[,;]\s*([-+]?[\d\.:]+)\s*$/',$result,$matches)){
							if ($this->getLogicalId() == 'latitude') {
								$result = $matches[1];
							} else {
								$result = $matches[2];
							}
						}
					}
					if (preg_match('/^(\d+):(\d+):((\d+)(\.\d+)?)$/',$result,$matches)){
						$result = $matches[1] + $matches[2]/60 + $matches[2]/3600;
					}
					return $result;
				} catch (Exception $e) {
					return $this->getConfiguration('calcul');
				}
			}
		}
		if ($this->getType() == 'action') {
			$linkedCmd_Id = str_replace('#','',$this->getConfiguration('linkedCmd'));	
			$linkedCmd = cmd::byId($linkedCmd_Id);
			if (!is_object($linkedCmd)) {
				throw new Exception(sprintf(__("Exécution de %s: La commande %s est introuvable!",__FILE__),$this->gewtHumanName(),$linkedCmd));
			}
			return $linkedCmd->execCmd($_option);
		}
	}
}
