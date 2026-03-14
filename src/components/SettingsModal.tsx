import { motion, AnimatePresence } from 'motion/react';
import { Settings, X } from 'lucide-react';
import { isSettingsSatisfiedForModel, type AppSettings, type ModelType } from '../services/desktop';

export type FontChoice = 'font-calligraphy' | 'font-brush' | 'font-cursive';

interface StyleOption {
  id: string;
  name: string;
}

interface SettingsModalProps {
  open: boolean;
  canClose: boolean;
  settings: AppSettings;
  selectedModel: ModelType;
  selectedFont: FontChoice;
  selectedStyleId: string;
  styles: StyleOption[];
  isSaving: boolean;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onSelectModel: (model: ModelType) => void;
  onSelectFont: (font: FontChoice) => void;
  onSelectStyle: (styleId: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function shouldOpenSettingsGate(
  settings: Pick<AppSettings, 'geminiApiKey' | 'dashscopeApiKey'>,
  modelType: ModelType,
): boolean {
  return !isSettingsSatisfiedForModel(settings, modelType);
}

export default function SettingsModal({
  open,
  canClose,
  settings,
  selectedModel,
  selectedFont,
  selectedStyleId,
  styles,
  isSaving,
  onSettingsChange,
  onSelectModel,
  onSelectFont,
  onSelectStyle,
  onClose,
  onSave,
}: SettingsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="gufeng-card p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-800/10 rounded-2xl flex items-center justify-center">
                  <Settings size={20} className="text-red-800" />
                </div>
                <div>
                  <h2 className="text-3xl font-black font-serif tracking-[0.2em] text-stone-950">工坊设置</h2>
                  <p className="text-sm text-stone-500 mt-1">按当前模型填写对应密钥即可开始；国内环境推荐先使用万相模式。</p>
                </div>
              </div>
              {canClose && (
                <button onClick={onClose} className="p-2.5 hover:bg-black/5 rounded-full transition-all hover:rotate-90 duration-500">
                  <X size={24} className="text-stone-800" />
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-lg font-black text-stone-950 font-serif tracking-wider">Gemini API Key</label>
                <input
                  value={settings.geminiApiKey}
                  onChange={(event) => onSettingsChange({ geminiApiKey: event.target.value })}
                  type="password"
                  placeholder="用于 Gemini 解析与 Gemini 出图"
                  className="w-full rounded-2xl border border-stone-300/80 bg-white/80 px-4 py-3 text-stone-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-200"
                />
                <p className="text-xs text-stone-500 leading-relaxed">选择“标准画卷”时需要填写。</p>
              </div>

              <div className="space-y-3">
                <label className="text-lg font-black text-stone-950 font-serif tracking-wider">DashScope API Key</label>
                <input
                  value={settings.dashscopeApiKey}
                  onChange={(event) => onSettingsChange({ dashscopeApiKey: event.target.value })}
                  type="password"
                  placeholder="用于万相解析与万相画卷"
                  className="w-full rounded-2xl border border-stone-300/80 bg-white/80 px-4 py-3 text-stone-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-200"
                />
                <p className="text-xs text-stone-500 leading-relaxed">选择“万象画卷”时只需填写这一项。</p>
              </div>

              <div className="space-y-3">
                <label className="text-lg font-black text-stone-950 font-serif tracking-wider">生成模型</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onSelectModel('free')}
                    className={`gufeng-button py-4 text-sm flex flex-col items-center gap-1 ${selectedModel === 'free' ? 'active' : 'bg-stone-200/60'}`}
                  >
                    <span className="font-bold">标准画卷</span>
                    <span className="text-[10px] opacity-60">Gemini 2.5 Flash</span>
                  </button>
                  <button
                    onClick={() => onSelectModel('wanxiang')}
                    className={`gufeng-button py-4 text-sm flex flex-col items-center gap-1 ${selectedModel === 'wanxiang' ? 'active' : 'bg-stone-200/60'}`}
                  >
                    <span className="font-bold">万象画卷</span>
                    <span className="text-[10px] opacity-60">wan2.6-t2i</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-lg font-black text-stone-950 font-serif tracking-wider">书法字体</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => onSelectFont('font-calligraphy')}
                    className={`gufeng-button py-3 text-sm ${selectedFont === 'font-calligraphy' ? 'active' : 'bg-stone-200/60'}`}
                  >
                    之芒星
                  </button>
                  <button
                    onClick={() => onSelectFont('font-brush')}
                    className={`gufeng-button py-3 text-sm ${selectedFont === 'font-brush' ? 'active' : 'bg-stone-200/60'}`}
                  >
                    马善政
                  </button>
                  <button
                    onClick={() => onSelectFont('font-cursive')}
                    className={`gufeng-button py-3 text-sm ${selectedFont === 'font-cursive' ? 'active' : 'bg-stone-200/60'}`}
                  >
                    龙藏体
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-lg font-black text-stone-950 font-serif tracking-wider">艺术风格</label>
                <div className="flex flex-wrap gap-2">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => onSelectStyle(style.id)}
                      className={`gufeng-button text-sm ${selectedStyleId === style.id ? 'active' : 'bg-stone-200/60'}`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onSave}
              disabled={isSaving || !isSettingsSatisfiedForModel(settings, selectedModel)}
              className="w-full mt-8 py-4 bg-red-800 text-white rounded-full font-bold text-lg hover:bg-red-900 shadow-xl shadow-red-900/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-400 disabled:shadow-none"
            >
              {isSaving ? '保存中...' : canClose ? '保存设置' : '保存并开始'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
