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

/* * ***************************Includes********************************* */
require_once __DIR__  . '/../../../../core/php/core.inc.php';

/*
 * Inclusion des classes héritières
 */
$dir = __DIR__ . '/../class/account';
if ($dh = opendir($dir)){
    while (($file = readdir($dh)) !== false){
	    if (substr_compare($file, ".class.php",-10,10) === 0) {
        	require_once  $dir . '/' . $file;
	    }
    }
    closedir($dh);
}

class account {
    /*     * *************************Attributs****************************** */

	protected static $plugin_id = "chargeurVE";
	public static $typeLabel = "";
	public static $image = "account.png";

	protected $accountType;
	protected $name = "";
	protected $id;
	protected $isEnable;
    
    /*     * ***********************Methodes static************************** */

	/*
	 * Retourne le prochain Id disponible
	 */
	private static function nextId() {
		$id = config::byKey ('accountId::next',self::$plugin_id,1,true);
		config::save('accountId::next',$id+1,self::$plugin_id);
		return($id);
	}

	/*
	 * retourne l'account dont l'id est donné en argument
	 */
	public static function byId($id) {
		return unserialize (config::byKey('account::' . $id, self::$plugin_id));
	}

	/*
	 * Recherche d'accounts selon le type
	 */
	public static function byType ($accountType) {
		$configs = config::searchKey('account::', self::$plugin_id);
		$accounts = array();
		foreach ($configs as $config) {
			$account = unserialize ($config['value']);
			if ($account->getType() == $accountType) {
				$accounts[] = $account;
			}
		}
		return $accounts;
	}

	/*
	 * Recherche les objets qui ont le type et le nom donnés en argument
	 */
	public static function byTypeAndName ($accountType, $name) {
		$configs = config::searchKey('account::', self::$plugin_id);
		$accounts = array();
		foreach ($configs as $config) {
			$account = unserialize ($config['value']);
			if ($account->getType() == $accountType and $account->getName() == $name) {
				$accounts[] = $account;
			}
		}
		switch (count($accounts)) {
		case 0:
			return NULL;
			break;
		case 1:
			return $accounts[0];
		default:
			return $accounts;
		}
	}

	/*
	 * Retounre une liste contenant tous les accounts
	 */
	public static function all ( $sortBy="accountType") {
		$configs = config::searchKey("account::", self::$plugin_id);
		$accounts = array();
		foreach ($configs as $config) {
			$accounts[] = unserialize($config['value']);
		}
		if (in_array($sortBy, array('name', 'accountType'))) {
			usort($accounts, function ($a, $b) {
				//if (($sortBy == "accountType") and ($a->getType() != $b->getType())) {
				//	return strcmp ($a->getType(), $b->getType());
				//}
				return strcmp ($a->getName(), $b->getName());
			});
		}
		return $accounts;
	}

	/*
	 * Retoune la liste de tous les types d'account connus
	 */
	public static function accountTypes() {
		$dir = __DIR__ . '/account';
		$accountTypes = array();
		try {
			$dh = opendir($dir);
			while (($file = readdir($dh)) !== false) {
				if (substr_compare($file, '.class.php', -10, 10) === 0) {
					$accountType = substr_replace($file,'',-10);
					$accountClass = $accountType . 'Account';
					$account = new $accountClass();
					$label = $account->getTypeLabel();
					$accountTypes[] = array('accountType' => $accountType, "label" => $label); 
				}
			}
		} catch (Exception $e) {
			return false;
		}
		return $accountTypes;
	}
	
    /*     * *********************Methodes d'instance************************ */

	/*
	 * Constructeur
	 */
	public function __construct() {
		$this->accountType = substr_replace(get_class($this),'',-7);
	}

	/*
	 * Enregistrement de la définition de l'account
	 */
	public function save() {
		if (trim($this->name) == "") {
			throw new Exception (__("Le nom n'est pas défini!",__FILE__));
		}
		if (method_exists($this, 'preSave')) {
			$this->preSave();
		}
		$accounts = self::byTypeAndName($this->getType(),$this->name);
		$onInsert = false;
		if (!isset($this->id) or $this->id == '' ) {
			if ($accounts) {
				throw new Exception (__("Il y a déjà un compte nommé ",__FILE__) . $this->name);
			}
			if (method_exists($this, 'preInsert')) {
				$this->preInsert();
			}
			$onInsert = true;
			$this->id = self::nextId();
		} else {
			if (method_exists($this, 'preUpdate')) {
				$this->preUpdate();
			}
		}
		config::save('account::' . $this->id, serialize($this), self::$plugin_id);
		if (onInsert) {
			if (method_exists($this, 'postInsert')) {
				$this->postInsert();
			}
		} else {
			if (method_exists($this, 'postUpdate')) {
				$this->postUpdate();
			}
		}
		if (method_exists($this, 'postInsert')) {
			$this->postSave();
		}
	}

	/*
	 * suppression de l'account
	 */
	public function remove() {
		if (method_exists($this, 'preRemove')) {
			$this->preRemove();
		}
		config::remove('account::' . $this->id, self::$plugin_id);
		if (config::byKey('account::' . $this->id, self::$plugin_id) != '') {
			throw new Exception (__("L'account n'a pas pu être supprimé!",__FILE__));
		}
		if (method_exists($this, 'postRemove')) {
			$this->postRemove();
		}
	}

	public function getHumanName($_tag = false, $_prettify = false) {
		$name = '';
		if ($_tag) {
			$typeConfig = config::byKey('ChargeurVE::' . $this->getType, 'chargeurVE');
			if ($_prettify) {
				$name .= '<span class="label labelObjectHuman">' . $this->getType() . '</span>';
			} else {
				$name .= $this->getType();
			}
		} else {
			$name .= '['.$this->getType().']'; 
		}
		if ($_prettify) {
			$name .= '<br/><strong>';
		}
		if ($_tag) {
			$name .= ' ' . $this->getName();
		} else {
			$name .= '[' . $this->getName() . ']';
		}
		if ($_prettify) {
			$name .= '</strong>';
		}
		return $name;
	}

	public function getImage() {
		if (strpos($this::$image, "/") === false) {
			return "plugins/" . self::$plugin_id . "/desktop/img/" . $this::$image;
		} else {
			return "plugins/" . self::$plugin_id . "/desktop/img/account.png";
		}
	}

	public function getType() {
		return substr_replace(get_class($this),'',-7);
	}

    /*     * **********************Getteur Setteur*************************** */

	/** id **/
	public function getId() {
		return $this->id;
	}

	public function setId($_id) {
		$this->id = $_id;
		return $this;
	}

	/** isEnable **/
	public function getIsEnable() {
		if ($this->isEnable == '' || !is_numeric($this->isEnable)){
			return 0;
		}
		return $this->isEnable;
	}

	public function setIsEnable($_isEnable) {
		$this->isEnable = $_isEnable;
		return $this;
	}

	/** name **/
	public function getName() {
		return $this->name;
	}

	public function setName($_name) {
		$this->name = $_name;
		return $this;
	}

	/** get type Label **/
	public function getTypeLabel() {
		if ($this::$typeLabel == "") {
			return get_class($this);
		} else {
			return $this::$typeLabel;
		}
	}

}
