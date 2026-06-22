/**
 * One-off migration script: replace Portuguese RankedPartyError/LobbyRoomError/PlayStateError/RankedQueueError throws with i18n keys.
 * Run: node scripts/migrate-domain-errors.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");

const rankedReplacements = [
  ['throw new RankedPartyError("Desafio inválido.", 400)', 'throw new RankedPartyError("invalidChallenge", 400)'],
  ['throw new RankedPartyError("Sessão não encontrada.", 404)', 'throw new RankedPartyError("sessionNotFound", 404)'],
  ['throw new RankedPartyError("Esta partida não está aguardando confirmações.", 400)', 'throw new RankedPartyError("matchNotAwaitingAccept", 400)'],
  ['throw new RankedPartyError("Você não participa desta partida.", 403)', 'throw new RankedPartyError("notInMatch", 403)'],
  ['throw new RankedPartyError("A votação de mapas não está ativa.", 400)', 'throw new RankedPartyError("mapVoteNotActive", 400)'],
  ['throw new RankedPartyError("Mapa inválido para esta partida.", 400)', 'throw new RankedPartyError("invalidMapForMatch", 400)'],
  ['throw new RankedPartyError("Tempo de votação encerrado.", 409)', 'throw new RankedPartyError("voteTimeEnded", 409)'],
  ['throw new RankedPartyError("Esta partida não pode ser cancelada agora.", 400)', 'throw new RankedPartyError("matchCannotCancelNow", 400)'],
  ['throw new RankedPartyError("Esta partida já foi encerrada.", 409)', 'throw new RankedPartyError("matchAlreadyEnded", 409)'],
  ['throw new RankedPartyError("Só é possível encerrar partidas em andamento.", 400)', 'throw new RankedPartyError("onlyEndLiveMatches", 400)'],
  ['throw new RankedPartyError("Rematch só após encerrar a partida anterior.", 400)', 'throw new RankedPartyError("rematchAfterPreviousEnd", 400)'],
  ['throw new RankedPartyError("Você não participa desta sala.", 403)', 'throw new RankedPartyError("notInRoom", 403)'],
  ['throw new RankedPartyError("Já existe uma partida ativa nesta sala.", 409)', 'throw new RankedPartyError("activeMatchInRoom", 409)'],
  ['throw new RankedPartyError("Troca de times só após encerrar a partida.", 400)', 'throw new RankedPartyError("swapTeamsAfterEnd", 400)'],
  ['throw new RankedPartyError("Mensagem vazia.", 400)', 'throw new RankedPartyError("emptyMessage", 400)'],
  ['throw new RankedPartyError("Mensagem muito longa.", 400)', 'throw new RankedPartyError("messageTooLong", 400)'],
  ['throw new RankedPartyError("Você não está em uma sala.", 400)', 'throw new RankedPartyError("notInPartyRoom", 400)'],
  ['throw new RankedPartyError("Usuário não encontrado.", 404)', 'throw new RankedPartyError("userNotFound", 404)'],
  ['throw new RankedPartyError("Região inválida.", 400)', 'throw new RankedPartyError("invalidRegion", 400)'],
  ['throw new RankedPartyError("Visibilidade inválida.", 400)', 'throw new RankedPartyError("invalidVisibility", 400)'],
  ['throw new RankedPartyError("Nível mínimo não pode ser maior que o máximo.", 400)', 'throw new RankedPartyError("minLevelAboveMax", 400)'],
  ['throw new RankedPartyError("Vincule sua conta Steam para jogar rankeada.", 403)', 'throw new RankedPartyError("steamRequired", 403)'],
  ['throw new RankedPartyError("Assinatura Premium ou Elite necessária.", 403)', 'throw new RankedPartyError("subscriptionRequired", 403)'],
  ['throw new RankedPartyError("Você não está em um time.", 400)', 'throw new RankedPartyError("notInTeam", 400)'],
  ['throw new RankedPartyError("Somente o líder pode editar o time.", 403)', 'throw new RankedPartyError("leaderOnlyEditTeam", 403)'],
  ['throw new RankedPartyError("Não é possível editar durante uma partida.", 409)', 'throw new RankedPartyError("cannotEditDuringMatch", 409)'],
  ['throw new RankedPartyError("Somente o líder pode desfazer o time.", 403)', 'throw new RankedPartyError("leaderOnlyDisbandTeam", 403)'],
  ['throw new RankedPartyError("Finalize a partida antes de desfazer o time.", 409)', 'throw new RankedPartyError("finishMatchBeforeDisband", 409)'],
  ['throw new RankedPartyError("Código de convite inválido.", 404)', 'throw new RankedPartyError("invalidInviteCode", 404)'],
  ['throw new RankedPartyError("Este lobby não está disponível.", 400)', 'throw new RankedPartyError("lobbyUnavailable", 400)'],
  ['throw new RankedPartyError("Lobby cheio.", 409)', 'throw new RankedPartyError("lobbyFull", 409)'],
  ['throw new RankedPartyError("Lobby não encontrado.", 404)', 'throw new RankedPartyError("lobbyNotFound", 404)'],
  ['throw new RankedPartyError("Você já está em outro lobby rankeado.", 409)', 'throw new RankedPartyError("alreadyInOtherRankedLobby", 409)'],
  ['throw new RankedPartyError("Você não está em um lobby.", 400)', 'throw new RankedPartyError("notInLobby", 400)'],
  ['throw new RankedPartyError("Somente o líder pode remover jogadores.", 403)', 'throw new RankedPartyError("leaderOnlyKick", 403)'],
  ['throw new RankedPartyError("Você não pode remover a si mesmo. Use desfazer time ou sair.", 400)', 'throw new RankedPartyError("cannotKickSelf", 400)'],
  ['throw new RankedPartyError("Jogador não está no seu time.", 404)', 'throw new RankedPartyError("playerNotInTeam", 404)'],
  ['throw new RankedPartyError("Não é possível remover jogadores durante uma partida.", 409)', 'throw new RankedPartyError("cannotRemoveDuringMatch", 409)'],
  ['throw new RankedPartyError("Finalize a partida antes de remover jogadores.", 409)', 'throw new RankedPartyError("finishMatchBeforeRemove", 409)'],
  ['throw new RankedPartyError("Sala não encontrada.", 404)', 'throw new RankedPartyError("roomNotFound", 404)'],
  ['throw new RankedPartyError("Esta sala não está disponível.", 400)', 'throw new RankedPartyError("roomUnavailable", 400)'],
  ['throw new RankedPartyError("Sala privada — entre pelo link/código de convite.", 403)', 'throw new RankedPartyError("privateRoomJoinRequired", 403)'],
  ['throw new RankedPartyError("Senha da sala incorreta.", 403)', 'throw new RankedPartyError("wrongRoomPassword", 403)'],
  ['throw new RankedPartyError("Sala cheia.", 409)', 'throw new RankedPartyError("roomFull", 409)'],
  ['throw new RankedPartyError("Entre ou crie um lobby de 5 jogadores primeiro.", 400)', 'throw new RankedPartyError("needFivePlayerLobby", 400)'],
  ['throw new RankedPartyError("Somente o líder pode desafiar outro lobby.", 403)', 'throw new RankedPartyError("leaderOnlyChallenge", 403)'],
  ['throw new RankedPartyError("Seu lobby já está em partida.", 409)', 'throw new RankedPartyError("lobbyInMatch", 409)'],
  ['throw new RankedPartyError("Cancele a busca na fila antes de desafiar outro lobby.", 409)', 'throw new RankedPartyError("cancelQueueBeforeChallenge", 409)'],
  ['throw new RankedPartyError("Não é possível desafiar seu próprio lobby.", 400)', 'throw new RankedPartyError("cannotChallengeSelf", 400)'],
  ['throw new RankedPartyError("Lobby alvo indisponível.", 404)', 'throw new RankedPartyError("targetLobbyUnavailable", 404)'],
  ['throw new RankedPartyError("Lobby alvo já está em partida.", 409)', 'throw new RankedPartyError("targetLobbyInMatch", 409)'],
  ['throw new RankedPartyError("Já existe um desafio pendente entre estes lobbies.", 409)', 'throw new RankedPartyError("pendingChallengeExists", 409)'],
  ['throw new RankedPartyError("Desafio não encontrado.", 404)', 'throw new RankedPartyError("challengeNotFound", 404)'],
  ['throw new RankedPartyError("Este desafio não está mais pendente.", 400)', 'throw new RankedPartyError("challengeNotPending", 400)'],
  ['throw new RankedPartyError("Desafio expirado.", 410)', 'throw new RankedPartyError("challengeExpired", 410)'],
  ['throw new RankedPartyError("Somente o líder do lobby desafiado pode responder.", 403)', 'throw new RankedPartyError("leaderOnlyRespondChallenge", 403)'],
];

const lobbyReplacements = [
  ['throw new LobbyRoomError("Modo Wingman 2x2 não encontrado. Rode o seed do banco.", 500)', 'throw new LobbyRoomError("wingmanModeNotFound", 500)'],
  ['throw new LobbyRoomError("Falha ao provisionar sala no lobby.", 500)', 'throw new LobbyRoomError("provisionFailed", 500)'],
  ['throw new LobbyRoomError("Sala não encontrada.", 404)', 'throw new LobbyRoomError("roomNotFound", 404)'],
  ['throw new LobbyRoomError("Esta sala não é 2x2.", 400)', 'throw new LobbyRoomError("notWingman2x2", 400)'],
  ['throw new LobbyRoomError("Já existe uma partida em andamento nesta sala.", 409)', 'throw new LobbyRoomError("matchInProgress", 409)'],
  ['throw new LobbyRoomError("Apenas o host ou admin pode iniciar a partida.", 403)', 'throw new LobbyRoomError("hostOrAdminOnlyStart", 403)'],
  ['throw new LobbyRoomError("Sala incompleta. Ative preencher com bots ou aguarde 4 jogadores.", 400)', 'throw new LobbyRoomError("roomIncomplete", 400)'],
  ['throw new LobbyRoomError("Salas são criadas automaticamente pelo sistema.", 403)', 'throw new LobbyRoomError("roomsAutoCreated", 403)'],
  ['throw new LobbyRoomError("Salas do sistema não podem ser editadas.", 403)', 'throw new LobbyRoomError("systemRoomNoEdit", 403)'],
  ['throw new LobbyRoomError("Somente o host pode editar a sala.", 403)', 'throw new LobbyRoomError("hostOnlyEdit", 403)'],
  ['throw new LobbyRoomError("Sala não pode ser editada neste estado.", 400)', 'throw new LobbyRoomError("roomNotEditableState", 400)'],
  ['throw new LobbyRoomError("Salas do sistema não podem ser fechadas.", 403)', 'throw new LobbyRoomError("systemRoomNoClose", 403)'],
  ['throw new LobbyRoomError("Somente o host pode fechar a sala.", 403)', 'throw new LobbyRoomError("hostOnlyClose", 403)'],
  ['throw new LobbyRoomError("Vincule sua conta Steam para entrar em salas.", 403)', 'throw new LobbyRoomError("steamRequiredJoin", 403)'],
  ['throw new LobbyRoomError("Esta sala não está disponível.", 400)', 'throw new LobbyRoomError("roomUnavailable", 400)'],
  ['throw new LobbyRoomError("Senha incorreta.", 401)', 'throw new LobbyRoomError("wrongPassword", 401)'],
  ['throw new LobbyRoomError("Sala cheia.", 409)', 'throw new LobbyRoomError("roomFull", 409)'],
  ['throw new LobbyRoomError("Você já está em outra sala. Saia antes de entrar nesta.", 409)', 'throw new LobbyRoomError("alreadyInOtherRoom", 409)'],
  ['throw new LobbyRoomError("Você não está nesta sala.", 400)', 'throw new LobbyRoomError("notInRoom", 400)'],
  ['throw new LobbyRoomError("Nenhuma sala disponível no momento.", 404)', 'throw new LobbyRoomError("noRoomAvailable", 404)'],
];

const queueReplacements = [
  ['throw new RankedQueueError("Time inválido para partida.", 500)', 'throw new RankedQueueError("invalidTeamForMatch", 500)'],
  ['throw new RankedQueueError("Lobby inválido.", 400)', 'throw new RankedQueueError("invalidLobby", 400)'],
  ['throw new RankedQueueError("Times incompletos.", 400)', 'throw new RankedQueueError("incompleteTeams", 400)'],
  ['throw new RankedQueueError("Lobby não encontrado.", 404)', 'throw new RankedQueueError("lobbyNotFound", 404)'],
  ['throw new RankedQueueError("Somente o líder pode iniciar a busca.", 403)', 'throw new RankedQueueError("leaderOnlyStartQueue", 403)'],
  ['throw new RankedQueueError("Seu lobby já está em partida.", 409)', 'throw new RankedQueueError("lobbyInMatch", 409)'],
  ['throw new RankedQueueError("Usuário não encontrado.", 404)', 'throw new RankedQueueError("userNotFound", 404)'],
  ['throw new RankedQueueError("Você não está em um lobby.", 400)', 'throw new RankedQueueError("notInLobby", 400)'],
  ['throw new RankedQueueError("Somente o líder pode cancelar a busca.", 403)', 'throw new RankedQueueError("leaderOnlyCancelQueue", 403)'],
];

function apply(file, replacements) {
  const path = join(root, file);
  let content = readFileSync(path, "utf8");
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  writeFileSync(path, content);
}

const files = [
  "lib/ranked/match-session-service.ts",
  "lib/ranked/party-chat.ts",
  "lib/ranked/party-service.ts",
  "lib/ranked/queue-service.ts",
  "lib/lobby/match-service.ts",
  "lib/lobby/rooms-service.ts",
];

for (const f of files) {
  apply(f, [...rankedReplacements, ...lobbyReplacements, ...queueReplacements]);
}

console.log("Done basic replacements");
