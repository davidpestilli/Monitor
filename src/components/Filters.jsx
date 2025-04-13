import { useEffect, useState } from 'react';

function Filters({ dados, onFiltro }) {
  const [gapFiltro, setGapFiltro] = useState('');
  const [tribunalSelecionado, setTribunalSelecionado] = useState('');
  const [situacaoSelecionada, setSituacaoSelecionada] = useState('');
  const [reuFiltro, setReuFiltro] = useState('');
  const [tjspFiltro, setTjspFiltro] = useState('');
  const [superiorFiltro, setSuperiorFiltro] = useState('');

  useEffect(() => {
    onFiltro({
      gap: gapFiltro,
      tribunal: tribunalSelecionado,
      situacao: situacaoSelecionada,
      reu: reuFiltro,
      tjsp: tjspFiltro,
      superior: superiorFiltro,
    });
  }, [
    gapFiltro,
    tribunalSelecionado,
    situacaoSelecionada,
    reuFiltro,
    tjspFiltro,
    superiorFiltro,
  ]);

  return (
    <div className="flex flex-wrap gap-4 items-center mb-4">
      <input
        type="text"
        placeholder="Filtrar por GAP"
        value={gapFiltro}
        onChange={(e) => setGapFiltro(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      />

      <input
        type="text"
        placeholder="Filtrar por Réu"
        value={reuFiltro}
        onChange={(e) => setReuFiltro(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      />

      <input
        type="text"
        placeholder="Filtrar por TJSP"
        value={tjspFiltro}
        onChange={(e) => setTjspFiltro(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      />

      <input
        type="text"
        placeholder="Filtrar por Superior"
        value={superiorFiltro}
        onChange={(e) => setSuperiorFiltro(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      />

      <select
        value={tribunalSelecionado}
        onChange={(e) => setTribunalSelecionado(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      >
        <option value="">Todos os Tribunais</option>
        {[...new Set(dados.map((item) => item.tribunal).filter(Boolean))].map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        value={situacaoSelecionada}
        onChange={(e) => setSituacaoSelecionada(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      >
        <option value="">Todas as Situações</option>
        {[...new Set(dados.map((item) => item.situacao).filter(Boolean))].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

export default Filters;
