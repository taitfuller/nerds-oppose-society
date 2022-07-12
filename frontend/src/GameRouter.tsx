import React, { useCallback, useEffect, useState } from "react";
import { Redirect, Route, Router, Switch, useParams } from "react-router-dom";
import { createMemoryHistory } from "history";
import createPersistedState from "use-persisted-state";
import {
  EndGamePage,
  EndRoundPage,
  LobbyPage,
  NicknamePage,
  SelectPunchlinePage,
  StartRoundPage,
  SubmitPunchlinePage,
} from "./pages";
import { useRound } from "./contexts/round";
import { usePlayers } from "./contexts/players";
import { PunchlinesAction, usePunchlines } from "./contexts/punchlines";
import { SocketProvider } from "./contexts/socket";
import io from "socket.io-client";

const socket = io({
  autoConnect: false,
});

export type Settings = {
  roundLimit: number;
  maxPlayers: number;
};

type PathParams = {
  gameCode: string;
};

const memoryHistory = createMemoryHistory();
const usePlayerIdState = createPersistedState("playerId");
const useTokenState = createPersistedState("token");

const INITIAL_ROUND_LIMIT = 69;
const INITIAL_MAX_PLAYERS = 40;

const useSetupSockets = ({
  settings,
  setSettings,
}: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}) => {
  const [, setPlayerId] = usePlayerIdState("");
  const [, setToken] = useTokenState("");
  const {
    setHost,
    initialisePlayers,
    addPlayer,
    removePlayer,
    incrementPlayerScore,
  } = usePlayers();
  const [, dispatchPunchlines] = usePunchlines();
  const {
    setRoundNumber,
    setSetup,
    incrementPlayersChosen,
    setPunchlinesChosen,
    setWinner,
  } = useRound();

  // Connection
  const handleNavigate = useCallback(
    (path: string) => memoryHistory.push(path.toLowerCase()),
    []
  );
  const handleHost = useCallback(setHost, [setHost]);
  const handlePlayersInitial = useCallback(initialisePlayers, [
    initialisePlayers,
  ]);
  const handleSettingsInitial = useCallback(setSettings, [setSettings]);
  const handleConnectError = useCallback(() => {
    setPlayerId("");
    setToken("");
  }, [setPlayerId, setToken]);

  // Lobby
  const handlePlayersAdd = useCallback(addPlayer, [addPlayer]);
  const handlePlayersRemove = useCallback(removePlayer, [removePlayer]);
  const handleSettingsUpdate = useCallback(
    (setting, value) => {
      let key;
      switch (setting) {
        case "MAX_PLAYERS":
          key = "maxPlayers";
          break;
        case "ROUND_LIMIT":
          key = "roundLimit";
          break;
        default:
          key = null;
      }
      if (key !== null) {
        const newSettings = {
          ...settings,
          [key]: value,
        };
        setSettings(newSettings);
      }
    },
    [setSettings, settings]
  );

  // Round
  const handlePunchlinesAdd = useCallback(
    (punchlines: string[]) =>
      dispatchPunchlines({ type: PunchlinesAction.ADD, punchlines }),
    [dispatchPunchlines]
  );
  const handlePunchlinesRemove = useCallback(
    (punchlines: string[]) =>
      dispatchPunchlines({
        type: PunchlinesAction.REMOVE,
        punchlines,
      }),
    [dispatchPunchlines]
  );
  const handleRoundNumber = useCallback(setRoundNumber, [setRoundNumber]);
  const handleRoundSetup = useCallback(setSetup, [setSetup]);
  const handleRoundIncrementPlayersChosen = useCallback(
    incrementPlayersChosen,
    [incrementPlayersChosen]
  );
  const handleRoundChosenPunchlines = useCallback(setPunchlinesChosen, [
    setPunchlinesChosen,
  ]);
  const handleRoundWinner = useCallback(
    (winningPlayerId: string, winningPunchlines: string[]) => {
      setWinner(winningPlayerId, winningPunchlines);
      incrementPlayerScore(winningPlayerId);
    },
    [incrementPlayerScore, setWinner]
  );

  useEffect(() => {
    // Connection
    socket.on("navigate", handleNavigate);
    socket.on("host", handleHost);
    socket.on("players:initial", handlePlayersInitial);
    socket.on("settings:initial", handleSettingsInitial);
    socket.on("connect_error", handleConnectError);

    // Lobby
    socket.on("players:add", handlePlayersAdd);
    socket.on("players:remove", handlePlayersRemove);
    socket.on("settings:update", handleSettingsUpdate);

    // Round
    socket.on("punchlines:add", handlePunchlinesAdd);
    socket.on("punchlines:remove", handlePunchlinesRemove);
    socket.on("round:number", handleRoundNumber);
    socket.on("round:setup", handleRoundSetup);
    socket.on(
      "round:increment-players-chosen",
      handleRoundIncrementPlayersChosen
    );
    socket.on("round:chosen-punchlines", handleRoundChosenPunchlines);
    socket.on("round:winner", handleRoundWinner);
    return () => {
      // Remove event handlers when component is unmounted to prevent buildup of identical handlers
      // Connection
      socket.off("navigate", handleNavigate);
      socket.off("host", handleHost);
      socket.off("players:initial", handlePlayersInitial);
      socket.off("settings:initial", handleSettingsInitial);
      socket.off("connect_error", handleConnectError);

      // Lobby
      socket.off("players:add", handlePlayersAdd);
      socket.off("players:remove", handlePlayersRemove);
      socket.off("settings:update", handleSettingsUpdate);

      // Round
      socket.off("punchlines:add", handlePunchlinesAdd);
      socket.off("round:number", handleRoundNumber);
      socket.off("round:setup", handleRoundSetup);
      socket.off(
        "round:increment-players-chosen",
        handleRoundIncrementPlayersChosen
      );
      socket.off("round:chosen-punchlines", handleRoundChosenPunchlines);
      socket.off("round:winner", handleRoundWinner);
    };
  });
};

const GameRouter = () => {
  const { gameCode } = useParams<PathParams>();
  const [settings, setSettings] = useState<Settings>({
    roundLimit: INITIAL_ROUND_LIMIT,
    maxPlayers: INITIAL_MAX_PLAYERS,
  });

  useSetupSockets({
    settings,
    setSettings,
  });

  return (
    <SocketProvider socket={socket}>
      <Router history={memoryHistory}>
        <Switch>
          <Route path="/nickname">
            <NicknamePage gameCode={gameCode} />
          </Route>

          <Route path="/lobby">
            <LobbyPage gameCode={gameCode} settings={settings} />
          </Route>

          <Route path="/before">
            <StartRoundPage roundLimit={settings.roundLimit} />
          </Route>

          <Route path="/players_choose">
            <SubmitPunchlinePage roundLimit={settings.roundLimit} />
          </Route>

          <Route path="/host_chooses">
            <SelectPunchlinePage roundLimit={settings.roundLimit} />
          </Route>

          <Route path="/after">
            <EndRoundPage roundLimit={settings.roundLimit} />
          </Route>

          <Route path="/scoreboard">
            <EndGamePage />
          </Route>

          <Route path="*">
            <Redirect to="/nickname" />
          </Route>
        </Switch>
      </Router>
    </SocketProvider>
  );
};

export default GameRouter;
