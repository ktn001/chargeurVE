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

/* * *************************** Includes ********************************* */
require_once __DIR__  . '/../../../../core/php/core.inc.php';

class EVcharger extends eqLogic {

    //========================================================================
    //========================== METHODES STATIQUES ==========================
    //========================================================================
	
	/*
	 * Surcharge de la function "byType" pour permettre de chercher les
	 * eqLogics du classe et des classes héritières.
	 *
	 * "byType('EVcharger_account_%')" par exemple pour avoir tous les
	 * accounts quelque soit le modèle
	 */
	public static function byType($_eqType_name, $_onlyEnable = false) {
		if (strpos($_eqType_name, '%') === false) {
			return parent::byType($_eqType_name, $_onlyEnable);
		}
		$values = array(
			'eqType_name' => $_eqType_name,
		);
		$sql =  'SELECT DISTINCT eqType_name';
		$sql .= '   FROM eqLogic';
		$sql .= '   WHERE eqType_name like :eqType_name';
		$eqTypes = DB::Prepare($sql, $values, DB::FETCH_TYPE_ALL);
		$eqLogics = array ();
		foreach ($eqTypes as $eqType) {
			 $eqLogics = array_merge($eqLogics,parent::byType($eqType['eqType_name'], $_onlyEnable));
		}
		return $eqLogics;
	}

	/*     * ********************** Gestion du daemon ************************* */

	/*
	 * Info sur le daemon
	 */
	public static function deamon_info() {
		$return = array();
		$return['log'] = __CLASS__;
		$return['state'] = 'nok';
		$pid_file = jeedom::getTmpFolder(__CLASS__) . '/daemon.pid';
		if (file_exists($pid_file)) {
			if (posix_getsid(trim(file_get_contents($pid_file)))) {
				$return['state'] = 'ok';
			} else {
				shell_exec(system::getCmdSudo() . 'rm -rf ' . $pid_file . ' 2>&1 > /dev/null');
			}
		}
		$return['launchable'] = 'ok';
		return $return;
	}

	/*
	 * Lancement de daemon
	 */
	public static function deamon_start() {
		self::deamon_stop();
		$daemon_info = self::deamon_info();
		if ($daemon_info['launchable'] != 'ok') {
			throw new Exception(__('Veuillez vérifier la configuration', __FILE__));
		}

		$path = realpath(dirname(__FILE__) . '/../../ressources/bin'); // répertoire du démon
		$cmd = 'python3 ' . $path . '/EVchargerd.py';
		$cmd .= ' --loglevel ' . log::convertLogLevel(log::getLogLevel(__CLASS__));
		$cmd .= ' --socketport ' . config::byKey('deamon::port', __CLASS__); // port
		$cmd .= ' --callback ' . network::getNetworkAccess('internal', 'proto:127.0.0.1:port:comp') . '/plugins/EVcharger/core/php/jeeEVcharger.php';
		$cmd .= ' --apikey ' . jeedom::getApiKey(__CLASS__);
		$cmd .= ' --pid ' . jeedom::getTmpFolder(__CLASS__) . '/daemon.pid';
		log::add(__CLASS__, 'info', 'Lancement démon');
		log::add(__CLASS__, "info", $cmd . ' >> ' . log::getPathToLog('EVcharger_daemon') . ' 2>&1 &');
		$result = exec($cmd . ' >> ' . log::getPathToLog('EVcharger_daemon.out') . ' 2>&1 &');
		$i = 0;
		while ($i < 20) {
			$daemon_info = self::deamon_info();
			if ($daemon_info['state'] == 'ok') {
				break;
			}
			sleep(1);
			$i++;
		}
		if ($daemon_info['state'] != 'ok') {
			log::add(__CLASS__, 'error', __('Impossible de lancer le démon, vérifiez le log', __FILE__), 'unableStartDeamon');
			return false;
		}
		message::removeAll(__CLASS__, 'unableStartDeamon');
		return true;
	}

	/*
	 * Arret de daemon
	 */
	public static function deamon_stop() {
		$pid_file = jeedom::getTmpFolder(__CLASS__) . '/daemon.pid';
		if (file_exists($pid_file)) {
			$pid = intval(trim(file_get_contents($pid_file)));
			log::add(__CLASS__, 'info', __('kill process: ',__FILE__) . $pid);
			system::kill($pid, false);
			foreach (range(0,15) as $i){
				if (self::deamon_info()['state'] == 'nok'){
					break;
				}
				sleep(1);
			}
			return;
		}
	}

	/*     * ************************ Les widgets **************************** */

	/*
	 * template pour les widget
	 */
	public static function templateWidget() {
		$return = array(
			'action' => array(
				'other' => array(
					'cable_lock' => array(
						'template' => 'cable_lock',
						'replace' => array(
							'#_icon_on_#' => '<i class=\'icon_green icon jeedom-lock-ferme\'><i>',
							'#_icon_off_#' => '<i class=\'icon_orange icon jeedom-lock-ouvert\'><i>'
						)
					)
				)
			),
			'info' => array(
				'numeric' => array(
					'etat' => array(
						'template' => 'etat',
						'replace' => array(
							'#texte_1#' =>  '{{Débranché}}',
							'#texte_2#' =>  '{{En attente}}',
							'#texte_3#' =>  '{{Recharge}}',
							'#texte_4#' =>  '{{Terminé}}',
							'#texte_5#' =>  '{{Erreur}}',
							'#texte_6#' =>  '{{Prêt}}'
						)
					)
				)
			)
		);
		return $return;
	}

	/*     * ************************ engine ********************************* */

	/* L'équipement "engine est créé lors de la promière activation du plugin et
	 * supprimé lors de la désinstallation du plugin. C'est le "moteur" du plugin.
	 */
	public static function createEngine() {
		$engine = self::getEngine();
		if (is_object($engine)) {
			return;
		}
		log::add("EVcharger","info","CCCCC " . print_r(self,true));
		try {
			$engine = new self();
			$engine->setEqType_name("EVcharger");
			$engine->setName('engine');
			$engine->setLogicalId('engine');
			$engine->setIsEnable(1);
			$engine->save();
		} catch (Exception $e) {
			log::add("EVcharger","error","CreateEngine: " . $e->getMessage());
		}
	}

	public static function getEngine() {
		return self::byLogicalId('engine','EVcharger');
	}

	/*     * ************************ Les crons **************************** */

//	public static function cron() {
//		EVcharger_account::_cron();
//	}
//
//	public static function cron5() {
//		EVcharger_account::_cron5();
//	}
//
//	public static function cron10() {
//		EVcharger_account::_cron10();
//	}
//
//	public static function cron15() {
//		EVcharger_account::_cron15();
//	}
//
//	public static function cron30() {
//		EVcharger_account::_cron30();
//	}
//
//	public static function cronHourly() {
//		EVcharger_account::_cronHourly();
//	}
//
//	public static function cronDaily() {
//		EVcharger_account::_cron15();
//	}

    //========================================================================
    //========================= METHODES D'INSTANCE ==========================
    //========================================================================

	/*
	 * Surcharge de getLinkToConfiguration() pour forcer les options "m" et "p"
	 * à "EVcharger" même pour les classes héritiaires.
	 */
	public function getLinkToConfiguration() {
		if (isset($_SESSION['user']) && is_object($_SESSION['user']) && !isConnect('admin')) {
			return '#';
		}
		return 'index.php?v=d&p=EVcharger&m=EVcharger&id=' . $this->getId();
	}

	/*
	 * La suppression de l'équipement "engine" se fait uniquement lors de
	 * la désinstallation du plugin. On en profite pour supprimer les équipement
	 * de classes héritières car le core Jeedom ne le fait pas.
	 */
	public function preRemove() {
		if ($this->getLogicalId() != 'engine') {
			return true;
		}
		$eqLogics = EVcharger::byType("EVcharger_%");
		if (is_array($eqLogics)) {
			foreach ($eqLogics as $eqLogic) {
				try {
					$eqLogic->remove();
				} catch (Exception $e) {
				} catch (Error $e) {
				}
			}
		}
	}

}

class EVchargerCmd extends cmd {

}

require_once __DIR__  . '/model.class.php';
require_once __DIR__  . '/EVcharger_account.class.php';
require_once __DIR__  . '/EVcharger_charger.class.php';
require_once __DIR__  . '/EVcharger_vehicle.class.php';
