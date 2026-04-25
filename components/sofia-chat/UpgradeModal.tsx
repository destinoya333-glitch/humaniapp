"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function UpgradeModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          You hit your daily limit 💪
        </h2>
        <p className="text-gray-600 mb-4">
          Look at you, hungry to learn. Upgrade to Pro and get{" "}
          <strong>unlimited conversations</strong> with Miss Sofia, the
          weekly exam, certificates, and the Shadow Coach reports.
        </p>

        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="border-2 border-blue-500 rounded-xl p-4 bg-blue-50">
            <div className="text-xs text-blue-600 font-semibold uppercase mb-1">
              Pro
            </div>
            <div className="text-2xl font-bold text-gray-900">
              S/49<span className="text-sm font-normal text-gray-500">/mes</span>
            </div>
            <ul className="text-xs text-gray-600 mt-2 space-y-1">
              <li>✅ Conversaciones ilimitadas</li>
              <li>✅ Examen semanal + certificado</li>
              <li>✅ Shadow Coach completo</li>
              <li>✅ Memoria avanzada</li>
            </ul>
          </div>

          <div className="border-2 border-purple-500 rounded-xl p-4 bg-purple-50">
            <div className="text-xs text-purple-600 font-semibold uppercase mb-1">
              Elite
            </div>
            <div className="text-2xl font-bold text-gray-900">
              S/99<span className="text-sm font-normal text-gray-500">/mes</span>
            </div>
            <ul className="text-xs text-gray-600 mt-2 space-y-1">
              <li>✅ Todo lo de Pro</li>
              <li>✅ Sesiones con humanos</li>
              <li>✅ Tracks especializados</li>
              <li>✅ Soporte prioritario</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200"
          >
            Mañana sigo
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/upgrade";
            }}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
          >
            Upgrade ahora
          </button>
        </div>
      </div>
    </div>
  );
}
