const faqs = [
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Premium e Elite são mensais sem fidelidade. O acesso continua até o fim do período pago.",
  },
  {
    q: "O slot reservado funciona em todos os servidores?",
    a: "Sim, em servidores públicos lotados. Servidores privados Elite têm regras próprias.",
  },
  {
    q: "As skins funcionam fora dos servidores clutchclube?",
    a: "Não. Skins liberadas são cosméticos apenas dentro da nossa rede de servidores.",
  },
  {
    q: "Preciso do anticheat no plano Free?",
    a: "Para modos ranqueados e competitivos, sim. Modos ForFun e Deathmatch públicos não exigem.",
  },
];

export function PremiumFaq() {
  return (
    <div className="mt-12 rounded-card glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-foreground">
        Perguntas frequentes
      </h2>
      <ul className="mt-6 divide-y divide-border">
        {faqs.map((faq) => (
          <li key={faq.q} className="py-4 first:pt-0 last:pb-0">
            <h3 className="font-display text-sm font-semibold text-foreground">
              {faq.q}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{faq.a}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
