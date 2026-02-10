const crypto = require('crypto');
const { execSync } = require('child_process');
const Store = require('electron-store');

class ActivationManagerPro {
  constructor() {
    this.store = new Store({ name: 'activation_data_pro' });
    
    this._p1 = Buffer.from([0x4d, 0x41, 0x52, 0x59]); 
    this._p2 = "Ramy-Jooo"; 
    this._p3 = Buffer.from([0x41, 0x6d, 0x61, 0x6c, 0x36, 0x31, 0x36, 0x39]); 
  }

  getHardwareId() {
    try {
      let id = "";
      if (process.platform === 'win32') {
        id = execSync('wmic baseboard get serialnumber').toString().split('\n')[1].trim();
        if (!id || id.includes("To be filled")) {
          id = execSync('wmic diskdrive get serialnumber').toString().split('\n')[1].trim();
        }
      } else {
        id = execSync('cat /etc/machine-id || uuidgen').toString().trim();
      }
      return crypto.createHash('sha256').update(id).digest('hex').toUpperCase();
    } catch (e) {
      return "FALLBACK-ID-12345"; 
    }
  }

  _getSecret() {
    const combined = this._p1.toString() + this._p2 + this._p3.toString();
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  generateActivationRequest() {
    const hwId = this.getHardwareId();
    return `${hwId.substring(0, 4)}-${hwId.substring(12, 16)}-${hwId.substring(24, 28)}`;
  }

  calculateActivationCode(requestCode) {
    const secret = this._getSecret();
    const hash = crypto.createHash('sha256').update(requestCode + secret).digest('hex');
    const code = hash.substring(0, 12).toUpperCase();
    return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}`;
  }

  verifyActivationCode(userInputCode) {
    const expected = this.calculateActivationCode(this.generateActivationRequest());
    if (userInputCode.replace(/-/g, '') === expected.replace(/-/g, '')) {
      this.store.set('activated', true);
      this.store.set('hwId', this.getHardwareId());
      return { success: true, message: "تم التفعيل!" };
    }
    return { success: false, message: "الكود خطأ" };
  }

  isActivated() {
    return this.store.get('activated') === true && 
          this.store.get('hwId') === this.getHardwareId();
  }
}

module.exports = ActivationManagerPro;