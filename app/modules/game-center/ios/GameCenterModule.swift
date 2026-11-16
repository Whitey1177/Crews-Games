import ExpoModulesCore
import GameKit

// Game Center for Pup Slope: sign-in, submitting distances, showing a dog's leaderboard,
// and (iOS 26+) starting a friend challenge.
public class GameCenterModule: Module {
  private let dismisser = GameCenterDismisser()
  private var authStarted = false
  private var authWaiters: [Promise] = []

  public func definition() -> ModuleDefinition {
    Name("GameCenter")

    Function("isAuthenticated") { () -> Bool in
      return GKLocalPlayer.local.isAuthenticated
    }

    Function("canChallenge") { () -> Bool in
      if #available(iOS 26.0, *) { return true }
      return false
    }

    // Signs the player in (shows Apple's sign-in sheet if needed). Resolves true/false.
    AsyncFunction("authenticate") { (promise: Promise) in
      DispatchQueue.main.async {
        let player = GKLocalPlayer.local
        if player.isAuthenticated { promise.resolve(true); return }
        self.authWaiters.append(promise)
        if self.authStarted { return }
        self.authStarted = true
        player.authenticateHandler = { [weak self] viewController, _ in
          guard let self = self else { return }
          if let vc = viewController {
            self.present(vc)
            return
          }
          let ok = GKLocalPlayer.local.isAuthenticated
          let waiting = self.authWaiters
          self.authWaiters.removeAll()
          waiting.forEach { $0.resolve(ok) }
        }
      }
    }

    // Submits a score (distance in meters). Game Center keeps each player's best automatically.
    AsyncFunction("submitScore") { (score: Int, leaderboardId: String, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else { promise.resolve(false); return }
      GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]) { error in
        promise.resolve(error == nil)
      }
    }

    // Opens Apple's leaderboard screen for one board (Global / Friends tabs are built in).
    AsyncFunction("showLeaderboard") { (leaderboardId: String, promise: Promise) in
      DispatchQueue.main.async {
        if #available(iOS 18.0, *) {
          GKAccessPoint.shared.trigger(leaderboardID: leaderboardId, playerScope: .global, timeScope: .allTime) {}
        } else {
          let vc = GKGameCenterViewController(leaderboardID: leaderboardId, playerScope: .global, timeScope: .allTime)
          vc.gameCenterDelegate = self.dismisser
          self.present(vc)
        }
        promise.resolve(true)
      }
    }

    // Opens Apple's "challenge a friend" screen for a challenge set up in App Store Connect (iOS 26+).
    AsyncFunction("challenge") { (challengeId: String, promise: Promise) in
      DispatchQueue.main.async {
        if #available(iOS 26.0, *) {
          GKAccessPoint.shared.trigger(challengeDefinitionID: challengeId) {}
          promise.resolve(true)
        } else {
          promise.resolve(false)
        }
      }
    }
  }

  private func present(_ vc: UIViewController) {
    guard let top = appContext?.utilities?.currentViewController() else { return }
    top.present(vc, animated: true)
  }
}

final class GameCenterDismisser: NSObject, GKGameCenterControllerDelegate {
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
  }
}
