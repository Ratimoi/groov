import { Request, Response, NextFunction } from "express";
import { getAuthUser } from "../middlewares/auth";
import type { FeedService } from "../services/FeedService";

export class FeedController {
  constructor(private feedService: FeedService) {}

  private handle(fn: (req: Request) => Promise<unknown>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        res.status(200).json(await fn(req));
      } catch (error) {
        next(error);
      }
    };
  }

  feed = this.handle((req) => this.feedService.feed(req.query, getAuthUser(req)));
  like = this.handle((req) => this.feedService.like(req.params.id, getAuthUser(req)));
  unlike = this.handle((req) => this.feedService.unlike(req.params.id, getAuthUser(req)));
  save = this.handle((req) => this.feedService.save(req.params.id, getAuthUser(req)));
  unsave = this.handle((req) => this.feedService.unsave(req.params.id, getAuthUser(req)));
  follow = this.handle((req) => this.feedService.follow(req.params.id, getAuthUser(req)));
  unfollow = this.handle((req) => this.feedService.unfollow(req.params.id, getAuthUser(req)));
}
