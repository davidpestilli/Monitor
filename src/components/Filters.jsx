import { useEffect, useState } from 'react';

function Filters({ dados, onFiltro }) {
  const [gapSelecionado, setGapSelecionado] = useState('');
  const [tribunalSelecionado, setTribunalSelecionado] = useState('');
  const [situacaoSelecionada, setSituacaoSelecionada] = useState('');

  const gaps = [...new Set(dados.map((item) => item.gap).filter(Boolean))];
  const tribunais = [...new Set(dados.map((item) => item.tribunal).filter(Boolean))];
  const situacoes = [...new Set(dados.map((item) => item.situacao).filter(Boolean))];

  useEffect(() => {
    onFiltro({
      gap: gapSelecionado,
      tribunal: tribunalSelecionado,
      situacao: situacaoSelecionada,
    });
  }, [gapSelecionado, tribunalSelecionado, situacaoSelecionada]);

  return (
    <div className="flex gap-4 items-center mb-4">
      <select
        value={gapSelecionado}
        onChange={(e) => setGapSelecionado(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      >
        <option value="">Todos os GAPs</option>
        {gaps.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      <select
        value={tribunalSelecionado}
        onChange={(e) => setTribunalSelecionado(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      >
        <option value="">Todos os Tribunais</option>
        {tribunais.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        value={situacaoSelecionada}
        onChange={(e) => setSituacaoSelecionada(e.target.value)}
        className="border px-2 py-1 rounded text-sm"
      >
        <option value="">Todas as Situações</option>
        {situacoes.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

export default Filters;
