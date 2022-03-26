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

class EVcharger_charger extends EVcharger {
    /*     * ************************* Attributs ****************************** */

    /*     * *********************** Methode static *************************** */

	public static function byAccountId($accountId) {
		return self::byTypeAndSearchConfiguration(__CLASS__,'"accountId":"'.$accountId.'"');
	}

	public static function byModelAndIdentifiant($model, $identifiant) {
		$identKey = model::getIdentifiantCharger($model);
		$searchConf = sprintf('"%s":"%s"',$identKey,$identifiant);
		$chargers = array();
		foreach (self::byTypeAndSearchConfiguration(__CLASS__,$searchConf) as $charger){
			if ($charger->getConfiguration('model') == $model){
				$chargers[] = $charger;
			}
		}
		return $chargers;

	}

    /*     * *********************Méthodes d'instance************************* */

    // Création/mise à jour des commande prédéfinies
	public function UpdateCmds($mandatoryOnly = false) {
		$ids = array();
		foreach (model::commands($this->getConfiguration('model'),$mandatoryOnly) as $logicalId => $config) {
			$cmd = (__CLASS__ . "Cmd")::byEqLogicIdAndLogicalId($this->getId(),$logicalId);
			if (!is_object($cmd)){
				$cmd = new EVcharger_chargerCMD();
				$cmd->setName(__($config['name'],__FILE__));
			}
			$cmd->setConfiguration('mandatory',$config['mandatory']);
			$cmd->setEqLogic_id($this->getId());
			$cmd->setLogicalId($logicalId);
			$cmd->setType($config['type']);
			$cmd->setSubType($config['subType']);
			$cmd->setOrder($config['order']);
			if (array_key_exists('template', $config)) {
				$cmd->setTemplate('dashboard',$config['template']);
				$cmd->setTemplate('mobile',$config['template']);
			}
			if (array_key_exists('visible', $config)) {
				$cmd->setIsVisible($config['visible']);
			}
			if (array_key_exists('displayName', $config)) {
				$cmd->setDisplay('showNameOndashboard', $config['displayName']);
				$cmd->setDisplay('showNameOnmobile', $config['displayName']);
			}
			if (array_key_exists('unite', $config)) {
				$cmd->setUnite($config['unite']);
			}
			if (array_key_exists('display::graphStep', $config)) {
				$cmd->setDisplay('graphStep', $config['display::graphStep']);
			}
			if (array_key_exists('rounding', $config)) {
				$cmd->setConfiguration('historizeRound', $config['rounding']);
			}
			$cmd->save();
		}
		foreach (model::commands($this->getConfiguration('model'),$mandatoryOnly) as $logicalId => $config) {
			if (array_key_exists('value',$config)){
				$cmd = EVchargerCmd::byEqLogicIdAndLogicalId($this->getId(),$logicalId);
				if (!is_object($cmd)){
					log::add("EVcharger","error",(sprintf(__("Commande avec logicalId = %s introuvable",__FILE__),$logicalId)));
					continue;
				}
				$value = cmd::byEqLogicIdAndLogicalId($this->getId(), $config['value'])->getId();
				$cmd->setValue($value);
				$cmd->save();
			}
			if (array_key_exists('calcul',$config)){
				$calcul = $config['calcul'];
				$cmd = EVchargerCmd::byEqLogicIdAndLogicalId($this->getId(),$logicalId);
				if (!is_object($cmd)){
					log::add("EVcharger","error",(sprintf(__("Commande avec logicalIs=%s introuvable",__FILE__),$logicalId)));
					continue;
				}
				preg_match_all('/#(.+?)#/',$calcul,$matches);
				foreach ($matches[1] as $logicalId) {
					$id = cmd::byEqLogicIdAndLogicalId($this->getId(), $logicalId)->getId();
					$calcul = str_replace('#' . $logicalId . '#', '#' . $id . '#', $calcul);
				}
				$cmd->setConfiguration('calcul', $calcul);
				$cmd->save();
			}
		}
	}

    // Fonction exécutée automatiquement avant la création de l'équipement
	public function preInsert() {
		$this->setConfiguration('image',model::images($this->getConfiguration('model'),'charger')[0]);
	}

    // Fonction exécutée automatiquement après la création de l'équipement
	public function postInsert() {
		$this->UpdateCmds(false);
	}

    // Fonction exécutée automatiquement après la sauvegarde (création ou mise à jour) de l'équipement
	public function postSave() {
		if ($this->getIsEnable()){
			$this->startListener();
		} else {
			$this->stopListener();
		}
	}

	// Fonction exécutée automatiquement après la sauvegarde de l'eqLogid ET des commandes si sauvegarde lancée via un AJAX
	public function postAjax() {
		if ($this->getAccountId() == '') {
			return;
		}
		$cmd_refresh = EVchargerCmd::byEqLogicIdAndLogicalId($this->getId(),'refresh');
		if (!is_object($cmd_refresh)) {
			return;
		}
		$cmd_refresh->execute();
		return;
	}

	public function getPathImg() {
		$image = $this->getConfiguration('image');
		if ($image == '') {
			return "/plugins/EVcharger/plugin_info/EVcharger_icon.png";
		}
		return $image;
	}

	public function getAccount() {
		return account::byId($this->getAccountId());
	}

	public function getIdentifiant() {
		$model = $this->getConfiguration('model');
		$configName = model::getIdentifiantCharger($model);
		return $this->getConfiguration($configName);
	}

	public function startListener() {
		if (! $this->getIsEnable()) {
			return;
		}
		$message = array(
			'cmd' => 'start_charger_listener',
			'chargerId' => $this->id,
			'identifiant' => $this->getIdentifiant()
		);
		account::byId($this->getAccountId())->send2Deamon($message);
	}

	public function stopListener() {
		$message = array(
			'cmd' => 'stop_charger_listener',
			'chargerId' => $this->id,
			'identifiant' => $this->getIdentifiant()
		);
		if ($this->getAccountId()) {
			account::byId($this->getAccountId())->send2Deamon($message);
		}
	}

    /*     * **********************Getteur Setteur*************************** */

	public function getAccountId() {
		return $this->getConfiguration('accountId');
	}

	public function setAccountId($_accountId§) {
		$this->setConfiguration('accountId',$_accountId);
		return $this;
	}

	public function getImage() {
		$image = $this->getConfiguration('image');
		if ($image == '') {
			return "/plugins/EVcharger/plugin_info/EVcharger_icon.png";
		}
		return $image;
	}

	public function setImage($_image) {
		$this->setConfiguration('image',$_image);
		return $this;
	}
}

class EVcharger_chargerCmd extends EVchargerCmd  {
    /*     * *************************Attributs****************************** */

    /*
	public static $_widgetPossibility = array();
    */

    /*     * ***********************Methode static*************************** */

    /*     * *********************Methode d'instance************************* */

	public function preSave() {
		if ($this->getLogicalId() == 'refresh') {
                        return;
                }
		if ($this->getType() == 'info') {
			$calcul = $this->getConfiguration('calcul');
			if (strpos($calcul, '#' . $this->getId() . '#') !== false) {
				throw new Exception(__('Vous ne pouvez appeler la commande elle-même (boucle infinie) sur',__FILE__) . ' : '.$this->getName());
			}
			$added_value = [];
			preg_match_all("/#([0-9]+)#/", $calcul, $matches);
			$value = '';
			foreach ($matches[1] as $cmd_id) {
				$cmd = self::byId($cmd_id);
				if (is_object($cmd) && $cmd->getType() == 'info') {
					if(isset($added_value[$cmd_id])) {
						continue;
					}
					$value .= '#' . $cmd_id . '#';
					$added_value[$cmd_id] = $cmd_id;
				}
			}
			preg_match_all("/variable\((.*?)\)/",$calcul, $matches);
			foreach ($matches[1] as $variable) {
				if(isset($added_value['#variable(' . $variable . ')#'])){
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

    // Exécution d'une commande
	public function execute($_options = array()) {
		log::add("EVcharger","debug","Execute : " . $this->getLogicalId());
		switch ($this->getType()) {
		case 'info':
			$calcul = $this->getConfiguration('calcul');
			if ($calcul) {
				return jeedom::evaluateExpression($calcul);
			}
			break;
		case 'action':
			$this->getEqLogic()->getAccount()->execute($this);
		}
	}

    /*     * **********************Getteur Setteur*************************** */
}
